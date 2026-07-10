import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { Route, RouterProvider, createBrowserRouter, createRoutesFromElements } from 'react-router-dom'
import Files from './components/Files.jsx'
import Share from './components/Share.jsx'
import Layout from './components/Layout.jsx'
import Governance from './components/Governance.jsx'

const router = createBrowserRouter([
        {
          path: "/",
          element: <Layout />,
          children: [
            {
              path: '',
              element: <App />
            },
            {
              path: '/files',
              element: <Files />
            },
            {
              path: '/share',
              element: <Share />
            },
            {
              path: '/governance',
              element: <Governance />
            },
          ],
        }
      ])

export const client = new ApolloClient({
  link: new HttpLink({ uri: 'http://localhost:8000/subgraphs/name/blockchain-drive/subgraph' }),
  cache: new InMemoryCache(),
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <RouterProvider router={router} />
    </ApolloProvider>
  </React.StrictMode>
)
