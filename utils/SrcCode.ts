


const sendToSrc=(CodeFiles: {[key: string]: String})=>{
    let newCodeFiles: {[key: string]: String} = {};
    for(let key in CodeFiles){
        if(key.includes("src/"))
        newCodeFiles[key]=CodeFiles[key];
        else if (key.includes("public/"))
        newCodeFiles[key]=CodeFiles[key];
        else
        newCodeFiles["src/"+key]=CodeFiles[key];
    }
    return newCodeFiles;
}

export default sendToSrc;