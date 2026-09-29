import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const url=process.env.MAP_URL||'http://localhost:4174/real/';
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--enable-webgl']});
try{
 const p=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await p.goto(url);await p.waitForFunction(()=>window.__real?.state.ready);await p.screenshot({path:'artifacts/real-desktop.jpg',quality:90});assert.ok((await p.evaluate(()=>window.__real.state)).vertices>100000);
 const canvas=p.locator('#render-target canvas');await canvas.hover();await p.mouse.move(700,400);await p.mouse.down();await p.mouse.move(820,390,{steps:12});await p.mouse.up();await p.waitForTimeout(600);assert.ok((await p.evaluate(()=>window.__real.state)).pose.x>.08);await p.screenshot({path:'artifacts/real-shifted.jpg',quality:90});
 await p.locator('#original-mode').click();assert.equal(await p.locator('#render-target').isVisible(),false);await p.locator('#depth-mode').click();assert.equal(await p.locator('#render-target').isVisible(),true);
 for(let i=1;i<5;i++){await p.locator(`[data-index="${i}"]`).click();await p.waitForFunction(i=>window.__real.state.ready&&window.__real.state.index===i,i);}
 await p.screenshot({path:'artifacts/real-village.jpg',quality:88});await p.locator('#auto').click();assert.equal((await p.evaluate(()=>window.__real.state)).auto,true);await p.locator('#reset').click();assert.equal((await p.evaluate(()=>window.__real.state)).auto,false);
 await p.locator('#about-open').click();assert.match(await p.locator('#about').innerText(),/不是完整的 3D 实景扫描/);await p.locator('#about-close').click();
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:1});const m=await context.newPage();m.on('pageerror',e=>errors.push(e.message));await m.goto(url);await m.waitForFunction(()=>window.__real?.state.ready);await m.screenshot({path:'artifacts/real-mobile.jpg',quality:90});
 const cdp=await context.newCDPSession(m),r=await m.locator('canvas').boundingBox();const x=r.x+r.width*.4,y=r.y+r.height*.5;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+60,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await m.waitForTimeout(500);assert.ok((await m.evaluate(()=>window.__real.state)).pose.x>.04);
 await m.locator('[data-index="1"]').tap();await m.waitForFunction(()=>window.__real.state.ready&&window.__real.state.index===1);await m.screenshot({path:'artifacts/real-mobile-courtyard.jpg',quality:90});
 await m.setViewportSize({width:844,height:390});await m.screenshot({path:'artifacts/real-mobile-landscape.jpg',quality:88});assert.equal(await m.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({url,desktop:await p.evaluate(()=>window.__real.state),mobile:await m.evaluate(()=>window.__real.state),errors}));
}finally{await browser.close();}
