import { app,Menu, BrowserWindow, dialog, ipcMain, nativeTheme } from "electron";
import { fstat } from "original-fs";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import {wordCount,getNow} from './tools';
import { errorsWord } from "./errorword";

const isMac = process.platform === 'darwin'

const template:any = [
  // { role: 'appMenu' }
  ...(isMac ? [{
        label:"Storyline",
    submenu: [
      { role: 'about' },
      { type: 'separator' },
      { role: 'services' },
      { type: 'separator' },
      { role: 'hide' },
      { role: 'hideothers' },
      { role: 'unhide' },
      { type: 'separator' },
      { role: 'quit' }
    ]
  }] : []),
  // { role: 'fileMenu' }
  {
    label: 'File',
    submenu: [
      isMac ? { role: 'close' } : { role: 'quit' }
    ]
  },
  // { role: 'editMenu' }
  {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      ...(isMac ? [
        { role: 'pasteAndMatchStyle' },
        { role: 'delete' },
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Speech',
          submenu: [
            { role: 'startSpeaking' },
            { role: 'stopSpeaking' }
          ]
        }
      ] : [
        { role: 'delete' },
        { type: 'separator' },
        { role: 'selectAll' }
      ])
    ]
  },
  // { role: 'viewMenu' }
  {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' }
    ]
  },
  // { role: 'windowMenu' }
  {
    label: 'Window',
    submenu: [
      { role: 'minimize' },
      { role: 'zoom' },
      ...(isMac ? [
        { type: 'separator' },
        { role: 'front' },
        { type: 'separator' },
        { role: 'window' }
      ] : [
        { role: 'close' }
      ])
    ]
  },
  {
    role: 'help',
    submenu: [
      {
        label: 'Learn More',
        click: async () => {
          const { shell } = require('electron')
          await shell.openExternal('https://www.violeime.com')
        }
      }
    ]
  }
]

const menu = Menu.buildFromTemplate(template)
Menu.setApplicationMenu(menu)

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      webSecurity: false
    },
    width: 1600
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, "../index.html"));
  // Open the DevTools.
  //mainWindow.webContents.openDevTools();
  //TODO
  ipcMain.on('openBook', (event, book) => {
   
    var path = book.path;
    var name = book.name;
    var jsonPath = path + "/story.json";
    var jsonData:any = {};
    if (!fs.existsSync(jsonPath)) {
      jsonData = {
        name: name,
        path: path,
        createTime: new Date().getTime(),
        modifyTime: new Date().getTime(),
        sec:[],
        mark:[]
      };
      fs.writeFileSync(jsonPath, JSON.stringify(jsonData));
    } else {
      var context=fs.readFileSync(jsonPath).toString();
      try{
        jsonData = JSON.parse(context);
      }catch(e){
        context=fs.readFileSync(path + "/story.old.json").toString();
        jsonData = JSON.parse(context);
      }
     
    }
    mainWindow.webContents.send("openBookInfo",jsonData);
  })
  ipcMain.on('openWork', (event) => {
    var path= os.homedir+"/.storyline";
    var workPath=path+"/work.json";
    if(!fs.existsSync(path)){
      fs.mkdirSync(path);
    }
    var workData:any={};
    if(!fs.existsSync(workPath)){
       workData={createTime:getNow(),updateTime:getNow(),navModel:0};
      fs.writeFileSync(workPath, JSON.stringify(workData));
    }else{
      try{
        workData = JSON.parse(fs.readFileSync(workPath).toString());
      }catch(e){
        workData = JSON.parse(fs.readFileSync(path+"/work.old.json").toString());
      }
    }

    mainWindow.webContents.send("openWorkInfo",workData);

  });
  ipcMain.on('saveWork', (event,workData) => {
  
    var path= os.homedir+"/.storyline";
    var workPath=path+"/work.json";
    if(!fs.existsSync(path)){
      fs.mkdirSync(path);
    }
    if(fs.existsSync(workPath)){
      if(fs.readFileSync(workPath).length>5)
        fs.renameSync(workPath,path+"/work.old.json");
    }
    fs.writeFileSync(workPath, JSON.stringify(workData));
  });
  ipcMain.on('newBook', (event,workData) => {
  
    dialog.showOpenDialog({properties: [ 'openDirectory']}).then(idx=>{
      mainWindow.webContents.send("newBookInfo",idx);
    })

  });

  ipcMain.on('loadImages', (event) => {
    var path=app.getAppPath()+"/src/image";
    try{
      var images= fs.readdirSync(path);
      mainWindow.webContents.send("loadedImages",images);
    }catch(e){
console.log(e);
    }
 
  });
  ipcMain.on('loadErrors', (event) => {
    var path= os.homedir+"/.storyline";
    var errorsPath=path+"/errors.json";
    if(!fs.existsSync(path)){
      fs.mkdirSync(path);
    }
    var errorsData:Array<any>=[];
    if(!fs.existsSync(errorsPath)){
      errorsData=errorsWord;
      fs.writeFileSync(errorsPath, JSON.stringify(errorsData));
    }else{
      try{
        errorsData = JSON.parse(fs.readFileSync(errorsPath).toString());
      }catch(e){
        errorsData = JSON.parse(fs.readFileSync(path+"/errors.old.json").toString());
      }
    }
      mainWindow.webContents.send("loadErrorsWords",errorsData);
 
  });
  ipcMain.on('saveErrors', (event,data) => {
    var path= os.homedir+"/.storyline";
    var errorsPath=path+"/errors.json";
    if(!fs.existsSync(path)){
      fs.mkdirSync(path);
    }
    var errorsData:Array<any>=data;
    if(!fs.existsSync(errorsPath)){
      errorsData=errorsWord;
      if(errorsData!=undefined&&errorsData.length>0){
        fs.renameSync(errorsPath,path+"/errors.old.json")
      }
      fs.writeFileSync(errorsPath, JSON.stringify(errorsData));
    }
  });


  ipcMain.on("delete",(event,name)=>{

    dialog.showMessageBox({
      type: 'info',
      title: '删除提示',
      message:'确认要删除《'+name+"》吗？",
      buttons: ['确认', '取消'],   //选择按钮，点击确认则下面的idx为0，取消为1
      cancelId: 1, //这个的值是如果直接把提示框×掉返回的值，这里设置成和“取消”按钮一样的值，下面的idx也会是1
  }).then(idx => {    
  //注意上面↑是用的then，网上好多是直接把方法做为showMessageBox的第二个参数，我的测试下不成功
      
      if (idx.response == 0) {
        mainWindow.webContents.send("deleteDialog",true);
      } else {
        mainWindow.webContents.send("deleteDialog",false);
      }
      })
  });

}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", () => {

  

  createWindow();
 

  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      ipcMain.removeAllListeners();
      createWindow();
    }
  });

});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.

