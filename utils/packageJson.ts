

const packageJson =(name:String="my-react-app",desc:String="React App",dependencies={})=>{
    return JSON.stringify({
        "name": name,
        "version": "1.0.0",
        "description": desc,
        "main": "index.tsx",
        "scripts": {
          "start": "react-scripts start",
          "build": "react-scripts build",
          "test": "react-scripts test",
          "eject": "react-scripts eject"
        },
        "keywords": [
          "react",
          "typescript",
          "application"
        ],
        "author": "LlamaCoder",
        "license": "MIT",
        "dependencies": {
          "react": "^18.0.0",
          "react-dom": "^18.0.0",
          "react-scripts": "5.0.0",
          "typescript": "^4.0.0",
            ...dependencies
        },
        "devDependencies": {
          "@types/react": "^18.0.0",
          "@types/react-dom": "^18.0.0"
        },
        "browserslist": {
          "production": [
            ">0.2%",
            "not dead",
            "not op_mini all"
          ],
          "development": [
            "last 1 chrome version",
            "last 1 firefox version",
            "last 1 safari version"
          ]
        }
      });
}

export default packageJson;