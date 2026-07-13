import React, { useState } from 'react';
import { Fragment } from 'react'
import { Disclosure, Menu, Transition, Dialog } from '@headlessui/react'
import { Bars3Icon, BellIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { Link } from 'react-router-dom';

const navigation = [
  { name: 'Upload', href: '/', current: true },
  { name: 'View Files', href: "/#files", current: false },
  { name: 'Share', href: '/share', current: false },
  { name: 'DAO', href: '/governance', current: false },
]

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

function scrollToSection() {
  const element = document.getElementById('files');
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
  }
}

const Navigation = () => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    name: 'Suhas (Project Admin)',
    email: 'admin@blockchaindrive.eth',
    phone: '+1 (555) 019-2834'
  });

  return (
    <>
      <Disclosure as="nav" className="sticky top-0 z-50 glass-panel border-b-0 rounded-none bg-slate-900/50">
        {({ open }) => (
          <>
            <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
              <div className="relative flex h-20 items-center justify-between">
                <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
                  {/* Mobile menu button*/}
                  <Disclosure.Button className="relative inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-white/10 hover:text-white focus:outline-none">
                    <span className="absolute -inset-0.5" />
                    <span className="sr-only">Open main menu</span>
                    {open ? (
                      <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                    ) : (
                      <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                    )}
                  </Disclosure.Button>
                </div>
                <div className="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start">
                  <div className="flex flex-shrink-0 items-center">
                    <Link to='/' className="flex items-center group">
                      <svg className="h-10 w-10 text-cyan-400 group-hover:text-cyan-300 transition-colors drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                        <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                        <line x1="12" y1="22.08" x2="12" y2="12"></line>
                        <circle cx="12" cy="12" r="3" fill="currentColor"></circle>
                      </svg>
                      <span className='text-2xl font-bold ml-3 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500'>
                        BlockDrive
                      </span>
                    </Link>
                  </div>
                  <div className="hidden sm:ml-10 sm:block flex-1">
                    <div className="flex space-x-8 items-center h-full">
                      <Link
                        to='/'
                        className="text-gray-300 hover:text-cyan-400 transition-colors px-3 py-2 text-sm font-semibold tracking-wide"
                      >
                        Home
                      </Link>

                      <Link
                        to='/#files'
                        onClick={scrollToSection}
                        className="text-gray-300 hover:text-cyan-400 transition-colors px-3 py-2 text-sm font-semibold tracking-wide"
                      >
                        Files
                      </Link>

                      <Link
                        to='/share'
                        className="text-gray-300 hover:text-cyan-400 transition-colors px-3 py-2 text-sm font-semibold tracking-wide"
                      >
                        Share
                      </Link>

                      <Link
                        to='/governance'
                        className="text-gray-300 hover:text-cyan-400 transition-colors px-3 py-2 text-sm font-semibold tracking-wide"
                      >
                        DAO
                      </Link>
                    </div>
                  </div>
                </div>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
                  {/* Profile dropdown */}
                  <Menu as="div" className="relative ml-3">
                    <div>
                      <Menu.Button className="relative flex rounded-full bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-900 border border-white/10 p-1 hover:bg-slate-700 transition-colors">
                        <span className="absolute -inset-1.5" />
                        <span className="sr-only">Open user menu</span>
                        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-cyan-400 to-purple-500 flex items-center justify-center text-white shadow-[0_0_10px_rgba(34,211,238,0.5)]">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                          </svg>
                        </div>
                      </Menu.Button>
                    </div>
                    <Transition
                      as={Fragment}
                      enter="transition ease-out duration-200"
                      enterFrom="transform opacity-0 scale-95"
                      enterTo="transform opacity-100 scale-100"
                      leave="transition ease-in duration-150"
                      leaveFrom="transform opacity-100 scale-100"
                      leaveTo="transform opacity-0 scale-95"
                    >
                      <Menu.Items className="absolute right-0 z-10 mt-3 w-48 origin-top-right rounded-xl glass-panel bg-slate-800/90 py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={() => {
                                setIsProfileOpen(true);
                                setIsEditingProfile(false);
                              }}
                              className={classNames(active ? 'bg-white/10 text-cyan-400' : 'text-gray-300', 'block w-full text-left px-4 py-2 text-sm transition-colors')}
                            >
                              Your Profile
                            </button>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={() => setIsSettingsOpen(true)}
                              className={classNames(active ? 'bg-white/10 text-cyan-400' : 'text-gray-300', 'block w-full text-left px-4 py-2 text-sm transition-colors')}
                            >
                              Settings
                            </button>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              className={classNames(active ? 'bg-white/10 text-red-400' : 'text-gray-300', 'block w-full text-left px-4 py-2 text-sm transition-colors')}
                            >
                              Disconnect
                            </button>
                          )}
                        </Menu.Item>
                      </Menu.Items>
                    </Transition>
                  </Menu>
                </div>
              </div>
            </div>

            <Disclosure.Panel className="sm:hidden glass-panel rounded-none border-x-0 border-t-0">
              <div className="space-y-1 px-2 pb-3 pt-2">
                {navigation.map((item) => (
                  <Disclosure.Button
                    key={item.name}
                    as="a"
                    href={item.href}
                    className="text-gray-300 hover:bg-white/10 hover:text-cyan-400 block rounded-md px-3 py-2 text-base font-medium transition-colors"
                  >
                    {item.name}
                  </Disclosure.Button>
                ))}
              </div>
            </Disclosure.Panel>
          </>
        )}
      </Disclosure>

      {/* Profile Modal */}
      <Transition appear show={isProfileOpen} as={Fragment}>
        <Dialog as="div" className="relative z-[100]" onClose={() => setIsProfileOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl glass-panel bg-slate-900/90 p-6 text-left align-middle shadow-xl transition-all border border-white/10 relative">
                  <button onClick={() => setIsProfileOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                  <Dialog.Title as="h3" className="text-2xl font-bold leading-6 text-white mb-6 flex justify-between items-center pr-8">
                    <span>User Profile</span>
                    {!isEditingProfile && (
                      <button 
                        onClick={() => setIsEditingProfile(true)}
                        className="text-sm font-normal text-cyan-400 hover:text-cyan-300 transition-colors"
                      >
                        Edit Profile
                      </button>
                    )}
                  </Dialog.Title>
                  <div className="mt-2 space-y-4">
                    <div className="flex items-center justify-center mb-6">
                      <div className="h-24 w-24 rounded-full bg-gradient-to-tr from-cyan-400 to-purple-500 flex items-center justify-center text-4xl text-white font-bold shadow-[0_0_20px_rgba(34,211,238,0.5)]">
                        {profileData.name.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Full Name</label>
                      {isEditingProfile ? (
                        <input 
                          type="text" 
                          className="glass-input w-full mt-1 px-3 py-2 text-sm" 
                          value={profileData.name}
                          onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                        />
                      ) : (
                        <p className="text-lg text-white font-medium bg-slate-800/50 p-3 rounded-lg border border-white/5 mt-1">{profileData.name}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email Address</label>
                      {isEditingProfile ? (
                        <input 
                          type="email" 
                          className="glass-input w-full mt-1 px-3 py-2 text-sm" 
                          value={profileData.email}
                          onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                        />
                      ) : (
                        <p className="text-lg text-white font-medium bg-slate-800/50 p-3 rounded-lg border border-white/5 mt-1">{profileData.email}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Phone Number</label>
                      {isEditingProfile ? (
                        <input 
                          type="text" 
                          className="glass-input w-full mt-1 px-3 py-2 text-sm" 
                          value={profileData.phone}
                          onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                        />
                      ) : (
                        <p className="text-lg text-white font-medium bg-slate-800/50 p-3 rounded-lg border border-white/5 mt-1">{profileData.phone}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end gap-3">
                    {isEditingProfile ? (
                      <>
                        <button
                          type="button"
                          className="px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                          onClick={() => setIsEditingProfile(false)}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={() => setIsEditingProfile(false)}
                        >
                          Save Changes
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="btn-primary w-full"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        Close Profile
                      </button>
                    )}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Settings Modal */}
      <Transition appear show={isSettingsOpen} as={Fragment}>
        <Dialog as="div" className="relative z-[100]" onClose={() => setIsSettingsOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl glass-panel bg-slate-900/90 p-6 text-left align-middle shadow-xl transition-all border border-white/10 relative">
                  <button onClick={() => setIsSettingsOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                  <Dialog.Title as="h3" className="text-2xl font-bold leading-6 text-white mb-6">
                    Application Settings
                  </Dialog.Title>
                  <div className="mt-2 space-y-6">
                    {/* Setting 1 */}
                    <div className="flex items-center justify-between bg-slate-800/30 p-4 rounded-xl border border-white/5">
                      <div>
                        <h4 className="text-white font-medium text-lg">IPFS Gateway</h4>
                        <p className="text-sm text-slate-400">Choose your preferred IPFS pinning service.</p>
                      </div>
                      <select className="bg-slate-700 text-white border border-slate-600 rounded-lg p-2 focus:outline-none focus:border-cyan-400">
                        <option>Lighthouse Filecoin (Default)</option>
                        <option>Infura</option>
                        <option>Web3.Storage</option>
                      </select>
                    </div>

                    {/* Setting 2 */}
                    <div className="flex items-center justify-between bg-slate-800/30 p-4 rounded-xl border border-white/5">
                      <div>
                        <h4 className="text-white font-medium text-lg">Default Network</h4>
                        <p className="text-sm text-slate-400">Select the default Ethereum network.</p>
                      </div>
                      <select className="bg-slate-700 text-white border border-slate-600 rounded-lg p-2 focus:outline-none focus:border-cyan-400">
                        <option>Sepolia Testnet</option>
                        <option>Localhost 8545</option>
                        <option>Mainnet</option>
                      </select>
                    </div>

                    {/* Setting 3 */}
                    <div className="flex items-center justify-between bg-slate-800/30 p-4 rounded-xl border border-white/5">
                      <div>
                        <h4 className="text-white font-medium text-lg">Theme Preference</h4>
                        <p className="text-sm text-slate-400">Application visual appearance.</p>
                      </div>
                      <select className="bg-slate-700 text-white border border-slate-600 rounded-lg p-2 focus:outline-none focus:border-cyan-400">
                        <option>Cyberpunk Dark</option>
                        <option>Light Mode</option>
                        <option>System Default</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end gap-3">
                    <button
                      type="button"
                      className="px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                      onClick={() => setIsSettingsOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => setIsSettingsOpen(false)}
                    >
                      Save Preferences
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}

export default Navigation;
