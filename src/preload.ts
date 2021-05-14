// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
import { dialog, ipcRenderer, remote } from "electron";
import { fstat } from "original-fs";
import * as fs from "fs";
import * as readline from 'readline';
import { wordCount, getNow, getRandomChineseName, getWindowsSelection, getBaiduSug, intToChinese, getErrorWord, ThemeColors, tips } from './tools';
import * as Sortable from 'sortablejs';
import * as fonts from 'font-list';



var bookPath: string = "";
var cur_cha: any;
var bookJson: any;
var cur_sec: any;
var pageModel: number = 0;
var timer = 0;
var workData: any;
var navModel: number = 0;
var workBook: any;
var isFristRender: boolean = true;
var themeHoverColor = "#fff";
var isContextChange:boolean=false;
function themeDark() {
  document.body.style.backgroundColor = "rgb(30,30,30)";
  document.body.style.color = "#eee";
  document.getElementById("page-view").style.backgroundColor = "#666";
  document.getElementById("start-context").style.backgroundColor = "#666";
  var svgs = document.getElementsByTagName("svg");
  for (var i = 0; i < svgs.length; i++) {
    var svg = svgs.item(i);
    svg.setAttribute("fill", "#fff");
  }
  themeHoverColor = "#555";
  var moreTabs = document.getElementById("more-tabs");
  eval("  moreTabs.firstElementChild.style.backgroundColor=themeHoverColor;");
}
function themeLight() {
  document.body.style.backgroundColor = "#e1e2e3";
  document.body.style.color = "#222";
  document.getElementById("page-view").style.backgroundColor = "#fff";
  document.getElementById("start-context").style.backgroundColor = "#fff";
  var svgs = document.getElementsByTagName("svg");
  for (var i = 0; i < svgs.length; i++) {
    var svg = svgs.item(i);
    svg.setAttribute("fill", "#000");
  }
  themeHoverColor = "#f7f8f9";
  var moreTabs = document.getElementById("more-tabs");
  eval("moreTabs.firstElementChild.style.backgroundColor=themeHoverColor;");
}
function theme() {
  /*判断是否支持主题色*/

  if (window.matchMedia('(prefers-color-scheme)').media === 'not all') {
    alert('Browser doesn\'t support dark mode');
  }

  /*判断是否处于深色模式*/
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    themeDark();
  }

  /*判断是否处于浅色模式*/
  if (window.matchMedia('(prefers-color-scheme: light)').matches) {
    themeLight();
  }


  /*模式切换听器*/
  var listeners = {
    dark: function (mediaQueryList: any) {
      if (mediaQueryList.matches) {
        //Do some thing
        themeDark();
      }
    },
    light: function (mediaQueryList: any) {
      if (mediaQueryList.matches) {
        //Do some thing
        themeLight();
      }
    }
  }

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener("change", listeners.dark);
  window.matchMedia('(prefers-color-scheme: light)').addEventListener("change", listeners.light);

}


window.addEventListener("DOMContentLoaded", () => {
  //if(window.matchMedia('(prefers-color-scheme: dark)').matches){

  theme();
  //}
  loadBgImages();
  //
  loadFontFamily();
  //

  var newView = document.getElementById("new_view");
  ipcRenderer.send("openWork");
  ipcRenderer.on("openWorkInfo", (event, work) => {
    workData = work;

    if (work.navModel != undefined) {
      navModel = work.navModel;
      updateNavModel();
    }

  if(workData.fontFamily!=undefined){
    document.body.style.fontFamily=workData.fontFamily;
  }
    var books = workData.book;
    if (books != undefined) {
      var start_books = document.getElementById("start_books");
      start_books.innerHTML = "";
      books.forEach((book: any) => {
        if (book != undefined && book.name != undefined) {
          var bookItem = document.createElement("div");
          bookItem.className = "item";
          bookItem.appendChild(createTitle(book.name));
          bookItem.appendChild(createInfo(book.info));
          bookItem.appendChild(createInfo("最近更新:" + book.last + " " + book.modifyTime));
          bookItem.onclick = () => {
            workBook = book;
            ipcRenderer.send("openBook", { path: book.path, name: book.name });
          };
          start_books.appendChild(bookItem);
        }
      });
    }
  })
  var createBook = document.getElementById("create_book");
  createBook.onclick = function () {
    var newName = eval("document.getElementById('new_name').value");
    var newInfo = eval("document.getElementById('new_info').value");
    var newPath = document.getElementById('dir_path').innerHTML;
    if (newPath.length > 0 && newInfo.length > 0 && newName.length > 0) {
      bookJson = {
        name: newName,
        path: newPath,
        info: newInfo,
        createTime: new Date().getTime(),
        modifyTime: new Date().getTime(),
        sec: [],
        mark: []
      };
      fs.writeFileSync(newPath + "/story.json", JSON.stringify(bookJson));
      bookPath = newPath;
      document.title = newName;
      var startView = document.getElementById("start-view");
      startView.style.display = "none";
      newView.style.display = "none";
      workBook = {
        name: newName,
        path: newPath,
        info: newInfo,
        createTime: new Date().getTime(),
        modifyTime: new Date().getTime(),
        lastPath: "",
        last: "",
        navModel: 0
      }
      if (workData.book == undefined) {
        workData.book = [];
      }
      workData.book.push(workBook);
      isFristRender = false;
      loadBook(bookJson);


    } else {
      createBook.innerHTML = "请先填写完整，然后再尝试创建！";
    }




  }


  var newBook = document.getElementById("new_book");
  newBook.onclick = function () {

    ipcRenderer.send("newBook", {});
  }
  ipcRenderer.on("newBookInfo", (event, book) => {

    if (book.canceled || book.filePaths.length == 0) {

    } else {
      document.getElementById("dir_path").innerHTML = book.filePaths[0];
      newView.style.display = "block";
    }


  });
  ipcRenderer.on("openBookInfo", (event, book) => {


    bookPath = book.path;
    bookJson = book;
    document.title = book.name;
    var startView = document.getElementById("start-view");
    startView.style.display = "none";
    //TODO
    // updateMoreMark();
    loadBook(book);
    isFristRender = false;
  })

  // var saveButton = document.getElementById("save-button");
  // saveButton.onclick = function () {
  //   updateCha(cur_cha);
  //   saveContextCha(cur_cha.path);
  //   saveBook();

  // }

  var navButton = document.getElementById("nav-button");
  navButton.onclick = function () {

    if (navModel == 0) {
      navModel = 1;
    } else if (navModel == 1) {
      navModel = -1;
    } else {
      navModel = 0;
    }
    workData.navModel = navModel;
    saveWork();
    updateNavModel();

  }

  const win = remote.getCurrentWindow();

  var clock: any;
  var clockVal = document.getElementById("clock-val");
  var clockButton = document.getElementById("clock-button");
  clockButton.onclick = function () {
    if (clock == undefined) {
      win.setKiosk(true);
      clock = setInterval(() => {
        timer++;
        var hour = Math.floor(timer / 3600);
        var min = Math.floor((timer - hour * 3600) / 60);
        var sec = timer - hour * 3600 - min * 60;
        var hourS=hour+"";if(hour<10) hourS="0"+hour;
        var minS=min+"";if(min<10) minS="0"+min;
        var secS=sec+"";if(sec<10) secS="0"+sec;
        clockVal.innerHTML = hourS + ":" + minS + ":" + secS;

        if(timer%2==0){
          clockButton.style.background=ThemeColors[Math.floor(Math.random()*ThemeColors.length)];
          clockButton.style.color="#fff";
        }else{
          clockButton.style.background="transparent";
          clockButton.style.color="";
        }
      

      }, 1000);

    } else {
      clockButton.style.background="transparent";
      clockButton.style.color="";
      win.setKiosk(false);
      clearInterval(clock);
      clock = undefined;
      timer = 0;
      clockVal.innerHTML = "00:00:00";
    }

  }

  var newChaButton = document.getElementById("new-cha-button");
  newChaButton.onclick = () => {

    var chaView = document.getElementById("nav-cha-view");
    var count = chaView.getElementsByTagName("li").length ;
    console.log(count);
    var name = "第" + intToChinese(count + "") + "章 章节名称"

    var newCha = {
      "title": name,
      "createTime": getNow(),
      "modifyTime": getNow(),
      "info": "章节大纲",
      "count": 0,
      "path": cur_sec.path + "/" + new Date().getTime()
    }
    if (cur_sec.cha == undefined)
      cur_sec.cha = [];
    cur_sec.cha.push(newCha);

    loadBookCha(cur_sec.cha);
    loadPageCha(newCha);
  }


  var newSecButton = document.getElementById("new-sec-button");
  newSecButton.onclick = () => {
    if (navModel != 0) {
      navModel = 0;
      updateNavModel();
    }

    var newSec = {
      "title": "分卷名称",
      "createTime": getNow(),
      "modifyTime": getNow(),
      "info": "分卷介绍",
      "cha": [{}],
      "path": new Date().getTime()
    }
    if (bookJson.sec == undefined)
      bookJson.sec = [];
    fs.mkdirSync(bookPath + "/" + newSec.path);
    bookJson.sec.push(newSec);
    loadPageSec(newSec);
    loadBookSec(bookJson.sec);
    saveBook();

  }
  var deleteObj: any;
  var deleteButton = document.getElementById("delete-button");
  deleteButton.onclick = () => {
    if (pageModel == 1) {
      deleteObj = cur_sec;
      ipcRenderer.send("delete", cur_sec.title);
      // cur_sec.delete = true;
      // loadBookSec(bookJson.sec);
    } else if (pageModel == -1) {
      deleteObj = cur_cha;
      ipcRenderer.send("delete", cur_cha.title);
      // cur_cha.delete = true;
      // loadBookCha(cur_sec.cha);
    }

  }
  ipcRenderer.on("deleteDialog", (event, res) => {
    if (res) {
      if (pageModel == 1) {

        deleteObj.delete = true;
        loadBookSec(bookJson.sec);
      } else if (pageModel == -1) {
        deleteObj.delete = true;
        loadBookCha(cur_sec.cha);
      }
      saveBook();
    }
  })


  var moreTabs = document.getElementById("more-tabs");
  var moreTabsView = document.getElementById("more-tabs-view");
  moreTabs.onclick = (event: any) => {
    var tab: Element = event.target;
    var list = moreTabs.getElementsByClassName("tab");
    var index = 0;
    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      if (item.innerHTML == tab.innerHTML) {
        eval(" item.style.backgroundColor=themeHoverColor;");
        index = i;
      } else {
        eval(" item.style.backgroundColor='transparent';");
      }
    }


    for (var i = 0; i < moreTabsView.children.length; i++) {
      var item = moreTabsView.children.item(i);

      if (index == i) {
        eval(" item.style.display='block';");

      } else {
        eval(" item.style.display='none';");
      }
    }



  };

  var masterTabsView = document.getElementById("master-tabs-view");
  var masterTabs= document.getElementById("master-tabs");
  masterTabs.onclick = (event: any) => {
    console.log( event.target);
    var tab: Element = event.target;
    var list = masterTabs.getElementsByClassName("tab");
    var index = 0;
    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      if (item.innerHTML == tab.innerHTML) {
        
        eval(" item.style.backgroundColor='"+ThemeColors[0]+"'");
        eval(" item.style.color='#fff'");
        index = i;
      } else {
        eval(" item.style.backgroundColor='transparent';");
        eval(" item.style.color=''");
      }
    }


    for (var i = 0; i < masterTabsView.children.length; i++) {
      var item = masterTabsView.children.item(i);

      if (index == i) {
        eval(" item.style.display='block';");

      } else {
        eval(" item.style.display='none';");
      }
    }



  };


  var nameButton = document.getElementById("name_button");
  nameButton.onclick = function () {

    var select = getWindowsSelection();
    updateMoreName(select);
  }
  var helpButton = document.getElementById("help_button");
  helpButton.onclick = function () {

    var select = getWindowsSelection();
    updateMoreHelp(select);
  }

  var peoMarkButton = document.getElementById("peo_mark_button");
  peoMarkButton.onclick = function () {
    var select = window.getSelection().toString();
    if (select != undefined && select.length > 0) {
      var mark = {
        title: select,
        type: "人物",
        info: "人物介绍"
      }
      addBookMark(mark);
    }
  }



  var addrMarkButton = document.getElementById("addr_mark_button");
  addrMarkButton.onclick = function () {
    var select = window.getSelection().toString();
    if (select != undefined && select.length > 0) {
      var mark = {
        title: select,
        type: "地点",
        info: "地点介绍"
      }
      addBookMark(mark);
    }
  }



  var orgMarkButton = document.getElementById("org_mark_button");
  orgMarkButton.onclick = function () {
    var select = window.getSelection().toString();
    if (select != undefined && select.length > 0) {
      var mark = {
        title: select,
        type: "组织",
        info: "组织介绍"
      }
      addBookMark(mark);
    }
  }

  var show_errors_button = document.getElementById("show_errors_button");
  var adderrorview = document.getElementById("add-error-view");
  show_errors_button.onclick = function () {
    if(adderrorview.style.display=="none"){
      adderrorview.style.display="block";
    }else{
      adderrorview.style.display="none";
    }
  }
  var new_errors_button = document.getElementById("new_errors_button");
  new_errors_button.onclick=()=>{
    var errorT=document.getElementById("error-t");
    var errorF=document.getElementById("error-f");
    if(errorT.textContent.length>0&&errorF.textContent.length>0){
      var flag=true;
      for(var i in errorsJson){
        if(errorsJson[i].f==errorF.textContent){
          flag=false;
          errorsJson[i].t=errorT.textContent;
          break;
        }
      }
      if(flag){
        var word={f:errorF.textContent,t:errorT.textContent};
        errorsJson.push(word);
      }
      updateErrorWors();
      saveErrorsWords();
    }
  }





  var pageTitle = document.getElementById("page_title");
  pageTitle.onblur = () => {

    if (pageModel == 1) {
      if (pageTitle.textContent != cur_sec.title) {
        saveContextSec();
        loadBookSec(bookJson.sec);
        saveBook();
      }

    } else if (pageModel == -1) {
      if (pageTitle.textContent != cur_cha.title) {
        updateCha(cur_cha);

        saveBook();
      }

    }



  }
  var context = document.getElementById("page_context");
  context.onkeyup=()=>{
    isContextChange=true;
  };
  context.onblur = () => {
    if (pageModel == 1) {
      saveContextSec();
      loadBookSec(bookJson.sec);
      saveBook();
      updateErrorWors();

    } else if (pageModel == -1) {
      if(isContextChange)
        saveContextCha(cur_cha.path);
    }
  }

  var pageInfo = document.getElementById("page_info");
  pageInfo.onblur = () => {
    if (pageModel == 1) {
      cur_sec.info = pageInfo.textContent;
      loadBookSec(bookJson.sec);
      saveBook();

    } else if (pageModel == -1) {
      cur_cha.info = pageInfo.innerHTML;
      loadBookCha(cur_sec.cha);

      saveBook();
    }
  }

  var fontSizeSelect = document.getElementById("font-size");
  fontSizeSelect.onchange = (event) => {
    var pageContext = document.getElementById("page_context");
    var val = eval("fontSizeSelect.value");

    switch (val) {
      case "-2": pageContext.style.fontSize = "14px"; break;
      case "-1": pageContext.style.fontSize = "16px";; break;
      case "0": pageContext.style.fontSize = "18px";; break;
      case "1": pageContext.style.fontSize = "20px";; break;
      case "2": pageContext.style.fontSize = "22px";; break;

    }
  }
  var fontFamilySelect = document.getElementById("font-family");
  fontFamilySelect.onchange = (event) => {
    var fontName = eval("fontFamilySelect.value");
    document.body.style.fontFamily=fontName;
    workData.fontFamily=fontName;
    saveWork();
  }

  var imageButtons = document.getElementById("image-buttons");
  imageButtons.onclick = (event: any) => {
    var imageButton: Element = event.target;
    var src = imageButton.getAttribute("src");
    var pageView = document.getElementById("page-view");
    pageView.style.backgroundImage = "url(" + src + ")";
   
  }


});




function saveWork() {
  ipcRenderer.send("saveWork", workData);
}
function loadBook(book: any) {

  loadBookSec(book.sec);
}
function loadBookSec(sec_list: any) {
  var sec_view = document.getElementById("nav-sec-view");
  sec_view.innerHTML = "";
  // var cha_view = document.getElementById("nav-cha-view");
  // cha_view.innerHTML = "";
  if (sec_list != undefined) {
    var sortList: Array<any> = [];
    for(var index in sec_list){
      var sec=sec_list[index];
      if (sec.title != undefined && (sec.delete == undefined || !sec.delete)) {
        sortList.push(sec);
        sec_view.appendChild(createSec(sec,index));
      }
    }
  
    var sortable = Sortable.create(sec_view, {
      onEnd: (evt) => {
        let itemEl = evt.item;  // dragged HTMLElement
        let oldIndex = evt.oldIndex;
        let newIndex = evt.newIndex;
        let temp = sortList[oldIndex];
        if (oldIndex < newIndex) {//向下移动调整顺序
          for (var i = oldIndex; i < newIndex; i++) {
            sortList[i] = sortList[i + 1];
          }
        } else if (oldIndex > newIndex) {//向上移动时调整顺序
          for (var i = oldIndex; i > newIndex; i--) {
            sortList[i] = sortList[i - 1];
          }
        }
        sortList[newIndex] = temp;
        sec_list = sortList;
        // hideList.forEach((item)=>{
        //   cha_list.push(item);
        // })
        bookJson.sec = sec_list;
        saveBook();


      }
    });
  }




}
function createSec(sec: any,index:any): Element {
  var sec_div = document.createElement("div");
  sec_div.className = "item";
  sec_div.appendChild(createTitle(sec.title));
  sec_div.appendChild(createInfo(sec.info));
  sec_div.setAttribute("draggable", "true");
  sec_div.style.borderLeft="5px solid "+ThemeColors[index];
  //event
  sec_div.onclick = () => {
    cur_sec = sec;
    loadPageSec(sec);
    loadBookCha(sec.cha);
  }
  if (isFristRender && (workBook.lastPath + "").indexOf(sec.path) == 0) {
    cur_sec = sec;
    if (workBook.lastPath == sec.path) {
      loadPageSec(sec);

      loadBookCha(sec.cha);
    } else {

      loadBookCha(sec.cha);
    }

  }

  return sec_div;
}
function createTitle(title: any): Element {
  var div = document.createElement("div");
  div.className = "title";
  div.innerText = title;
  return div;
}
function createInfo(info: any): Element {
  var div = document.createElement("div");
  div.className = "info";
  div.innerHTML = info;
  div.innerHTML = div.textContent;
  return div;
}
function createMarkInfo(mark: any): Element {
  var div = document.createElement("div");
  div.className = "mark-info info";
  div.setAttribute("contenteditable", "true");
  div.innerText = mark.info;
  div.onblur = (event) => {
    var text = div.textContent;
    if (mark.info != text) {
      mark.info = text;
      updateMoreMark();
    }
  }

  return div;
}
function loadBookCha(cha_list: any) {

  var cha_view = document.getElementById("nav-cha-view");
  cha_view.innerHTML = "";
  if (cha_list != undefined) {

    var sortList: Array<any> = [];
    var hideList: Array<any> = [];
    cha_list.forEach((cha: any) => {
      if (cha.title != undefined && (cha.delete == undefined || !cha.delete)) {
        cha_view.appendChild(createCha(cha));
        sortList.push(cha);
      } else {
        hideList.push(hideList);
      }


    });
    var sortable = Sortable.create(cha_view, {
      onEnd: (evt) => {
        let itemEl = evt.item;  // dragged HTMLElement
        let oldIndex = evt.oldIndex;
        let newIndex = evt.newIndex;
        let temp = sortList[oldIndex];
        if (oldIndex < newIndex) {//向下移动调整顺序
          for (var i = oldIndex; i < newIndex; i++) {
            sortList[i] = sortList[i + 1];
          }
        } else if (oldIndex > newIndex) {//向上移动时调整顺序
          for (var i = oldIndex; i > newIndex; i--) {
            sortList[i] = sortList[i - 1];
          }
        }
        sortList[newIndex] = temp;
        cha_list = sortList;
        cur_sec.cha = cha_list;

        saveBook();


      }
    });

  }


}
function createCha(cha: any): Element {
  var cha_div = document.createElement("li");
  cha_div.className = "item";
  cha_div.appendChild(createTitle(cha.title));
  cha_div.appendChild(createInfo(cha.info));
  cha_div.setAttribute("draggable", "true");
  //event
  cha_div.onclick = () => {
    loadPageCha(cha);
  }
  if (isFristRender && workBook.lastPath == cha.path) {
    cur_cha = cha;
    loadPageCha(cha);
  }
  return cha_div;
}
function updateCha(cha: any) {
  var pageTitle = document.getElementById("page_title");
  cha.title = pageTitle.textContent;
  cha.modifyTime = getNow();
  loadBookCha(cur_sec.cha);

}

function saveBook() {
  workBook.modifyTime = getNow();
  var storyPath = bookPath + "/story.json";
  saveWork();
  if (fs.existsSync(storyPath)) {
    if (fs.readFileSync(storyPath).length > 5)
      fs.renameSync(storyPath, bookPath + "/story.old.json");
    fs.writeFileSync(bookPath + "/story.json", JSON.stringify(bookJson));
  }

}
function loadPageCha(cha: any) {


  pageModel = -1;

  document.getElementById("page_path").textContent = cur_sec.title + " / " + cha.title;
  document.getElementById("more-title").textContent = cha.title;

  workBook.lastPath = cha.path;
  workBook.last = cur_sec.title + " / " + cha.title;
  saveWork();

  var pageTitle = document.getElementById("page_title");
  pageTitle.innerHTML = cha.title;
  var pageCount = document.getElementById("page_count");
  pageCount.innerHTML = "字数:" + cha.count + "个";
  var pageInfo = document.getElementById("page_info");
  pageInfo.innerHTML = cha.info;

  var pageCreate = document.getElementById("page_create");
  pageCreate.innerHTML = "创建时间:" + cha.createTime;

  var pageModify = document.getElementById("page_modify");
  pageModify.innerHTML = "更新时间:" + cha.modifyTime;

  cur_cha = cha;
  loadContext(cha.path);
}
function loadPageSec(sec: any) {
  pageModel = 1;
  document.getElementById("page_path").textContent = sec.title;
  document.getElementById("more-title").textContent = sec.title;
  workBook.lastPath = sec.path;
  workBook.last = sec.title;
  saveWork();

  var pageTitle = document.getElementById("page_title");
  pageTitle.innerHTML = sec.title;
  var pageInfo = document.getElementById("page_info");
  pageInfo.innerHTML = sec.info;

  var context = document.getElementById("page_context");
  context.textContent = sec.info;
}
function saveContextSec() {
  var pageTitle = document.getElementById("page_title");
  var context = document.getElementById("page_context");
  cur_sec.title = pageTitle.textContent;
  cur_sec.info = context.textContent;
  cur_sec.modifyTime = getNow();

}

function saveContextCha(path: string) {
 
  var context = document.getElementById("page_context");
  var pList = context.getElementsByTagName("p");
  var txt = "";
  for (var p in pList) {
    if (pList[p].textContent == undefined)
      continue;
    txt += pList[p].textContent + "\n";
  }
  cur_cha.count = wordCount(txt);
  cur_cha.modifyTime=getNow();
  if (fs.existsSync(bookPath + "/" + path)) {
    if (fs.readFileSync(bookPath + "/" + path).length > 5)
      fs.renameSync(bookPath + "/" + path, bookPath + "/" + path + ".old");
  }
  fs.writeFileSync(bookPath + "/" + path, txt);
  saveBook();
}
function loadContext(path: string) {
  console.log(Math.random()*tips.length);
  document.getElementById("tips").innerText=tips[Math.floor(Math.random()*tips.length)];

  var context = document.getElementById("page_context");

  var falg = fs.existsSync(bookPath + "/" + path);
  if (!falg) {
    context.innerHTML = "<p>请输入你的正文</p>";
    return;
  }
  context.innerHTML = "";
  var textPath = bookPath + "/" + path;
  if (fs.readFileSync(bookPath + "/" + path).length < 5) {
    textPath = textPath + ".old";
  }

  let fRead = fs.createReadStream(textPath);
  let objReadLine = readline.createInterface({
    input: fRead
  });
  objReadLine.on('line', function (line) {
    var p = document.createElement("p");
    p.innerText = line;
    context.appendChild(p);
   // lineMoreMark(p);
  });
  objReadLine.on("close",function(){
    isContextChange=false;
    updateMoreMark();
    updateErrorWors();
  })


}

function updateNavModel() {

  var view = document.getElementById("nav-view");
  var viewSec = document.getElementById("nav-sec-view");
  var viewCha = document.getElementById("nav-cha-view");
  if (navModel == 0) {//全部展开
    view.style.display = "flex";
    view.style.width = "400px";
    viewSec.style.display = "block";
    viewCha.style.display = "block";

  } else if (navModel == 1) {//部分展开
    view.style.display = "flex";
    view.style.width = "200px";
    viewSec.style.display = "none";
    viewCha.style.display = "block";
  } else {//全部隐藏
    view.style.display = "none";
    view.style.width = "400px";
    viewSec.style.display = "block";
    viewCha.style.display = "block";
  }


}
function updateMoreName(select: string) {
  var context = document.getElementById("more-tool-context");
  context.innerHTML = "";
  for (var i = 0; i < 30; i++) {
    var name = getRandomChineseName(select);
    var span = document.createElement("span");
    span.className = "name";
    span.innerText = name;
    context.appendChild(span);

  }


}
function updateMoreHelp(select: string) {

  getBaiduSug(select, (sug: any) => {
    var context = document.getElementById("more-tool-context");
    context.innerHTML = "";
    if (sug != undefined) {
      var list = sug.g;
      if (list != undefined) {
        list.forEach((item: any) => {
          var word = item.q;
          var name = getRandomChineseName(select);
          var span = document.createElement("span");
          span.className = "name";
          span.innerText = word;
          context.appendChild(span);
        });
      }
    }

  });

}
function lineMoreMark(p:Element) {

  if (bookJson.mark != undefined) {
 
    var text =p.textContent;
    console.log(text);
    bookJson.mark.forEach((mark: any) => {
      if (text.indexOf(mark.title) >= 0) {
        var word=mark.title;
        p.innerHTML=p.innerHTML.replace(eval("/"+word+"/g"),"<mark>"+word+"</mark>");
      }

    });
  }
}
function updateErrorWors(){
  var pageContext=document.getElementById("page_context");
  var text =pageContext.textContent;
  if(text==undefined||text.length==0)
    return;
    var context=document.getElementById("more-tool-errors");
    context.innerHTML="";
  var words=getErrorWord(text);
  words.forEach((word:any)=>{
    if(text.indexOf(word.f)>=0)
      {
        pageContext.innerHTML=pageContext.innerHTML.replace(eval("/"+word.f+"/g"),"<error title='"+word.t+"'>"+word.f+"</error>");
        var error=document.createElement("div");
        error.className="error";
        error.innerHTML="<span class='f'>"+word.f+"</span> -> <span class='t'>"+word.t+"</span>";
        context.appendChild(error);
      }

  })

}
var errorsJson:Array<any>;

function loadErrorsWords(){
  ipcRenderer.send("loadErrors");
  ipcRenderer.on("loadErrorsWords",(event,data)=>{
    errorsJson=data;
  });

}
function saveErrorsWords(){
  ipcRenderer.send("saveErrors",errorsJson);
}

function updateMoreMark() {
  var context = document.getElementById("more-mark-context");
  context.innerHTML = "";
  if (bookJson.mark != undefined) {
    var pageContext=document.getElementById("page_context");
    var text =pageContext.textContent;
    var marks:Array<any>=[];
    bookJson.mark.forEach((mark: any) => {
      if (text.indexOf(mark.title) >= 0) {
        var item = document.createElement("div");
        item.className = "mark";
        item.appendChild(createTitle(mark.title + " - " + mark.type));
        item.appendChild(createMarkInfo(mark));
        context.appendChild(item);
        var newMark={title:mark.title,type:mark.type};
        marks.push(newMark);
        var word=mark.title;
        pageContext.innerHTML=pageContext.innerHTML.replace(eval("/"+word+"/g"),"<mark title='"+mark.info+"'>"+word+"</mark>");
      }

    });
    cur_cha.mark=marks;
    saveBook();
  }
}
function addBookMark(mark: any) {
  if (bookJson.mark == undefined) bookJson.mark = [];
  var flag = true;
  for (var index in bookJson.mark) {
    if (bookJson.mark[index].title == mark.title) {
      flag = false;
      break;
    }
  }
  if (flag) {
    bookJson.mark.push(mark);
    updateMoreMark();
    saveBook();
  }

}
function loadBgImages() {
  ipcRenderer.send("loadImages");
  ipcRenderer.on("loadedImages", (event: any, images: any) => {

    var imagesContext = document.getElementById("image-buttons");
    imagesContext.innerHTML = "";
    for (var i in images) {
      var imgEle = document.createElement("img");
      imgEle.className = "image-button";
      imgEle.setAttribute("src", "./src/image/" + images[i]);
      imagesContext.appendChild(imgEle);
    }


  })
}

function loadFontFamily(){

  var fontFontFamily=document.getElementById("font-family");
  fontFontFamily.innerHTML="";
  fonts.getFonts().then((fontList)=>{
    fontList.forEach((font)=>{
      var option=document.createElement("option");
      option.setAttribute("value",font);
      option.innerHTML=font;
      fontFontFamily.appendChild(option);
    })
  })

}