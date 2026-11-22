import {createServer} from "node:http";
import {readFileSync} from "node:fs";
import {join,resolve} from "node:path";
const here=resolve(import.meta.dirname);
const parent=resolve(here,"..");
const paths=new Map([
 ["/",["index.html","text/html;charset=utf-8",here]],
 ["/index.html",["index.html","text/html;charset=utf-8",here]],
 ["/app.mjs",["app.mjs","text/javascript;charset=utf-8",here]],
 ["/v2.html",["v2.html","text/html;charset=utf-8",here]],
 ["/v2.mjs",["v2.mjs","text/javascript;charset=utf-8",here]],
 ["/artifacts/v2/manifest.json",["manifest.json","application/json;charset=utf-8",join(parent,"artifacts","v2")]],
 ...["QuestOrigin","QuestDestinationV2","QuestGuardianReactiveV2"].map(x=>[
  "/artifacts/v2/"+x+".json",[x+".json","application/json;charset=utf-8",join(parent,"artifacts","v2")]
 ]),
 ["/artifacts/manifest.json",["manifest.json","application/json;charset=utf-8",join(parent,"artifacts")]],
 ...["QuestOrigin","QuestDestination","QuestGuardianReactive"].map(x=>[
  "/artifacts/"+x+".json",[x+".json","application/json;charset=utf-8",join(parent,"artifacts")]
 ])
]);
const srv=createServer((req,res)=>{
 const route=(req.url||"").split("?")[0],file=paths.get(route);
 if(req.method!=="GET"||!file){
   res.writeHead(404,{"Content-Type":"text/plain","Cache-Control":"no-store"}).end("Not found");return;
 }
 try{
   const body=readFileSync(join(file[2],file[0]));
   res.writeHead(200,{"Content-Type":file[1],"Cache-Control":"no-store",
    "X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer",
    "Content-Security-Policy":"default-src 'self'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"});
   res.end(body);
 }catch(e){res.writeHead(500,{"Content-Type":"text/plain"}).end("Missing local precompiled artifact");}
});
srv.listen(4177,"127.0.0.1",()=>console.log("LDN Reactive — wallet owner approval dApp on http://127.0.0.1:4177"));
