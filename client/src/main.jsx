import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { Route, RouterProvider, createHashRouter, createRoutesFromElements } from 'react-router-dom'
import Files from './components/Files.jsx'
import Share from './components/Share.jsx'
import Layout from './components/Layout.jsx'
import Governance from './components/Governance.jsx'

const router = createHashRouter([
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
  link: new HttpLink({ uri: 'https://api.studio.thegraph.com/query/1756937/blockchain-drive/v0.0.2' }),
  cache: new InMemoryCache(),
});

import { PasswordProvider } from './context/PasswordContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <PasswordProvider>
        <RouterProvider router={router} />
      </PasswordProvider>
    </ApolloProvider>
  </React.StrictMode>
)
