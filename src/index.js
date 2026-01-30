// TEST: Verify Claude posts PR comments after .github workflow fix
// This PR tests that the shared workflow from alliance-genome/.github
// now correctly instructs Claude to use 'gh pr comment' to post reviews
// Delete this entire comment block after verification is complete
// Line 5 for good measure
import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

import { Provider } from 'react-redux';
import { store } from './store';
import { setStore } from './api';

// Inject store into API client to avoid circular dependency
setStore(store);

const container = document.getElementById('root');
const root = createRoot(container);
root.render(
    <Provider store={store}>
        <App />
    </Provider>
);

// having this wrapped around Provider/App will call a reducer multiple times with the same arguments to test the purity of the reducer (so actions will be dispatched multiple times even though they shouldn't be, which messes with things like an async call to get data, causing it to happen multiple times)
//   <React.StrictMode>
//   </React.StrictMode>,

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
