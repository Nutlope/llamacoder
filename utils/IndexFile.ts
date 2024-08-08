

const ReactAppIndexFile = ()=>{
    return `import React from 'react';
    import ReactDOM from 'react-dom';
    import App from './App.tsx';
    
    ReactDOM.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
      document.getElementById('root')
    );
    `;
}
export default ReactAppIndexFile;