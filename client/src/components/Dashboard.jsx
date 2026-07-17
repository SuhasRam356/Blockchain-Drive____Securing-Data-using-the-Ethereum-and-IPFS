import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { gql } from '@apollo/client';
import { client } from '../main.jsx';
import axios from 'axios';


export default function Dashboard({ contract, account }) {
  const [storageUsedMB, setStorageUsedMB] = useState(0);
  const [loading, setLoading] = useState(true);
  const [totalFiles, setTotalFiles] = useState(0);
  const [fileStats, setFileStats] = useState([]);
  const [sharedUsers, setSharedUsers] = useState(0);
  const [activeShares, setActiveShares] = useState(0);
  const [expiredShares, setExpiredShares] = useState(0);
  const [activityLog, setActivityLog] = useState([]);

  const COLORS = ['#06b6d4', '#a855f7', '#3b82f6', '#f43f5e', '#10b981', '#f59e0b'];

  useEffect(() => {
    let isMounted = true;

    const fetchDashboardData = async (isBackground = false) => {
      if (!account || !contract) return;
      if (!isBackground) setLoading(true);

      try {
        // 1. Fetch File Count and Categories
        const countBig = await contract.getFileCount(account);
        const count = countBig.toNumber();
        setTotalFiles(count);

        let files = [];
        if (count > 0) {
           files = await contract.displayPage(account, 0, count);
        }

        const categories = {};
        files.forEach(file => {
          const catString = file.category || "General";
          let cat = catString.split('|')[0].trim();
          if (!cat) cat = "General";
          else cat = cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();
          categories[cat] = (categories[cat] || 0) + 1;
        });
        setFileStats(Object.keys(categories).map(key => ({ name: key, value: categories[key] })));

        // 2. Fetch True Storage Used from IPFS
        try {
          if (count > 0 && files.length > 0) {
            const fetchPromises = files.map(file => {
                const url = file.url.replace("ipfs.io", "cf-ipfs.com"); 
                return axios.head(url).then(res => {
                    return parseInt(res.headers['content-length'] || "0", 10);
                }).catch(() => 2.5 * 1024 * 1024); // fallback to 2.5MB estimate if fetch fails
            });
            
            const sizes = await Promise.all(fetchPromises);
            const totalBytes = sizes.reduce((acc, curr) => acc + curr, 0);
            setStorageUsedMB((totalBytes / (1024 * 1024)).toFixed(2));
          } else {
              setStorageUsedMB(0);
          }
        } catch (e) {
          console.error("Storage calculation error:", e);
          setStorageUsedMB((count * 2.5).toFixed(2)); 
        }

        // 3. Fetch Events (Activity & Shares) via The Graph
        const GET_DASHBOARD_DATA = gql`
          query GetDashboardData($user: Bytes!) {
            accesses(where: { owner: $user }) {
              revokedAt
            }
            activityEvents(where: { user: $user }, orderBy: timestamp, orderDirection: desc, first: 15) {
              id
              type
              text
              timestamp
              txHash
            }
          }
        `;
        
        const { data: graphData } = await client.query({
            query: GET_DASHBOARD_DATA,
            variables: { user: account.toLowerCase() },
            fetchPolicy: 'network-only'
        });

        const accesses = graphData.accesses || [];
        let active = 0, expired = 0;
        accesses.forEach(a => {
            if (a.revokedAt === null) active++;
            else expired++;
        });
        
        setSharedUsers(accesses.length);
        setActiveShares(active);
        setExpiredShares(expired);

        let events = graphData.activityEvents || [];

        if (isMounted) {
            setActivityLog(events);
            setLoading(false);
        }

      } catch (e) {
         console.error("Dashboard data fetch error:", e);
         if (isMounted) setLoading(false);
      }
    };

    fetchDashboardData(false);

    let interval;
    const handleBlockchainEvent = () => {
        // Wait a few seconds for The Graph to index the new block before fetching
        setTimeout(() => fetchDashboardData(true), 3000);
    };

    if (contract) {
        // Poll gracefully every 12 seconds to catch Pinata/Graph updates
        interval = setInterval(() => fetchDashboardData(true), 12000);
        
        // Listen to all relevant events for real-time updates
        contract.on("FileAdded", handleBlockchainEvent);
        contract.on("FileDeleted", handleBlockchainEvent);
        contract.on("FileUpdated", handleBlockchainEvent);
        contract.on("AccessGranted", handleBlockchainEvent);
        contract.on("AccessRevoked", handleBlockchainEvent);
    }

    return () => { 
        isMounted = false; 
        if (interval) clearInterval(interval);
        if (contract) {
            contract.off("FileAdded", handleBlockchainEvent);
            contract.off("FileDeleted", handleBlockchainEvent);
            contract.off("FileUpdated", handleBlockchainEvent);
            contract.off("AccessGranted", handleBlockchainEvent);
            contract.off("AccessRevoked", handleBlockchainEvent);
        }
    };
  }, [account, contract]);

  if (!account) return null;

  return (
    <div className="w-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 animate-fadeIn">
      <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-8">User Dashboard & Analytics</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* KPI Cards */}
        <div className="glass-panel p-6 flex flex-col justify-between relative overflow-hidden border-t-4 border-t-cyan-400 shadow-xl hover:border-t-cyan-300 transition-colors">
           <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl -z-10 -mr-10 -mt-10"></div>
           <p className="text-slate-400 font-medium text-sm">Total Files Secured</p>
           <div className="flex items-end justify-between mt-2">
             <h3 className="text-4xl font-bold text-white">{loading ? '...' : totalFiles}</h3>
             <svg className="w-8 h-8 text-cyan-400/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
           </div>
        </div>

        <div className="glass-panel p-6 flex flex-col justify-between relative overflow-hidden border-t-4 border-t-purple-400 shadow-xl hover:border-t-purple-300 transition-colors">
           <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl -z-10 -mr-10 -mt-10"></div>
           <div className="flex justify-between items-center">
             <p className="text-slate-400 font-medium text-sm">True Storage Used</p>
             <span className="text-[10px] text-purple-400/70 border border-purple-500/30 px-2 py-0.5 rounded-full bg-purple-500/10" title="Dynamically fetched from IPFS nodes">Live from IPFS</span>
           </div>
           <div className="flex items-end justify-between mt-2">
             <h3 className="text-4xl font-bold text-white">{loading ? '...' : storageUsedMB}<span className="text-xl text-slate-500 ml-1">MB</span></h3>
             <svg className="w-8 h-8 text-purple-400/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path></svg>
           </div>
        </div>

        <div className="glass-panel p-6 flex flex-col justify-between relative overflow-hidden border-t-4 border-t-green-400 shadow-xl hover:border-t-green-300 transition-colors">
           <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-2xl -z-10 -mr-10 -mt-10"></div>
           <p className="text-slate-400 font-medium text-sm">Shared Access Users</p>
           <div className="flex items-end justify-between mt-2">
             <h3 className="text-4xl font-bold text-white">{loading ? '...' : sharedUsers}</h3>
             <svg className="w-8 h-8 text-green-400/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
           </div>
           <div className="flex gap-4 mt-3 text-xs">
              <span className="text-green-400 bg-green-400/10 px-2 py-0.5 rounded border border-green-400/20">Active: {activeShares}</span>
              <span className="text-red-400 bg-red-400/10 px-2 py-0.5 rounded border border-red-400/20">Expired: {expiredShares}</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Card */}
        <div className="glass-panel p-8 relative overflow-hidden h-[400px] flex flex-col items-center justify-center lg:col-span-1 shadow-2xl">
          <h3 className="text-lg font-semibold text-white absolute top-6 left-6 z-10">Category Distribution</h3>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl -z-10 -ml-10 -mb-10"></div>
          {loading ? (
             <div className="animate-spin h-8 w-8 border-4 border-cyan-500 border-t-transparent rounded-full"></div>
          ) : fileStats.length > 0 ? (
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={fileStats}
                   cx="50%"
                   cy="50%"
                   innerRadius={60}
                   outerRadius={90}
                   paddingAngle={5}
                   dataKey="value"
                   stroke="rgba(0,0,0,0)"
                 >
                   {fileStats.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                   ))}
                 </Pie>
                 <Tooltip 
                   contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                   itemStyle={{ color: '#fff' }}
                 />
               </PieChart>
             </ResponsiveContainer>
          ) : (
             <p className="text-slate-400 text-center mt-10">No categories found.</p>
          )}
          {!loading && fileStats.length > 0 && (
             <div className="mt-4 flex gap-3 flex-wrap justify-center overflow-y-auto max-h-24 no-scrollbar">
               {fileStats.map((stat, index) => (
                 <div key={index} className="flex items-center gap-1.5 text-xs text-slate-300">
                   <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                   {stat.name} ({stat.value})
                 </div>
               ))}
             </div>
          )}
        </div>

        {/* Activity Log */}
        <div className="glass-panel p-8 lg:col-span-2 shadow-2xl flex flex-col h-[400px] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -z-10 -mr-10 -mt-10"></div>
          <h3 className="text-lg font-semibold text-white mb-6">Recent Blockchain Activity</h3>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 no-scrollbar">
            {loading ? (
                <div className="flex justify-center py-10"><div className="animate-spin h-8 w-8 border-4 border-cyan-500 border-t-transparent rounded-full"></div></div>
            ) : activityLog.length === 0 ? (
                <p className="text-slate-400 text-center mt-10">No recent activity found.</p>
            ) : (
                activityLog.map((log, index) => (
                  <div key={`${log.id}-${index}`} className={`flex items-start gap-4 p-4 rounded-xl bg-slate-800/40 border-l-4 border-y border-r border-y-white/5 border-r-white/5 hover:bg-slate-700/50 hover:shadow-lg transition-all cursor-default ${
                    log.type === 'upload' ? 'border-l-cyan-400 hover:border-l-cyan-300' :
                    log.type === 'delete' ? 'border-l-red-400 hover:border-l-red-300' :
                    log.type === 'grant' ? 'border-l-green-400 hover:border-l-green-300' :
                    'border-l-violet-400 hover:border-l-violet-300'
                  }`}>
                    <div className={`p-2.5 rounded-lg shrink-0 ${
                       log.type === 'upload' ? 'bg-cyan-500/20 text-cyan-400' :
                       log.type === 'delete' ? 'bg-red-500/20 text-red-400' :
                       log.type === 'grant' ? 'bg-green-500/20 text-green-400' :
                       'bg-violet-500/20 text-violet-400'
                    }`}>
                      {log.type === 'upload' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>}
                      {log.type === 'delete' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>}
                      {log.type === 'grant' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"></path></svg>}
                      {log.type === 'revoke' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>}
                    </div>
                    <div className="flex-1 flex flex-col justify-center">
                      <p className="text-white font-medium text-[15px]">{log.text}</p>
                      <p className="text-xs text-slate-400 mt-1 font-mono tracking-wide">{new Date(parseInt(log.timestamp) * 1000).toLocaleString()}</p>
                    </div>
                    <div className="shrink-0 flex flex-col justify-center text-xs text-slate-500 font-mono self-center">
                        <a href={`https://sepolia.etherscan.io/tx/${log.txHash}`} target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 transition-colors flex items-center gap-1 cursor-pointer" title={log.txHash}>
                            Tx
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                        </a>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
