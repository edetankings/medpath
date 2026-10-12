import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import postcss from 'postcss';
const require=createRequire(import.meta.url);
const emptyPassport={allergies:[],medications:[],conditions:[],documents:[]};
const context={currentRoute:'dashboard',navigate(){},showToast(){},appointments:[],passport:emptyPassport,isAppointmentsLoading:false,isPassportLoading:false,appointmentsError:'',passportError:'',toasts:[]};
const auth={user:null,isAuthenticated:false,login:async()=>{},register:async()=>{}};
const originalFetch=globalThis.fetch;
globalThis.fetch=()=>{throw new Error('UI tests must never access a live API');};
async function bundle(entry,{hooks=false}={}) {
 const result=await build({entryPoints:[entry],bundle:true,write:false,platform:'node',format:'cjs',external:['react','react/jsx-runtime'],define:{'import.meta.env':'{}'},loader:{'.css':'empty'},plugins:[{name:'isolated-ui',setup(b){
  b.onResolve({filter:/context\/(AppContext|AuthContext)$/},a=>({path:a.path,namespace:'context'}));
  b.onLoad({filter:/.*/,namespace:'context'},()=>({contents:'export const useApp=()=>globalThis.__uiFixture.context; export const useAuth=()=>globalThis.__uiFixture.auth;'}));
  if(hooks){b.onResolve({filter:/^react$/},()=>({path:'hooks',namespace:'hooks'}));b.onLoad({filter:/.*/,namespace:'hooks'},()=>({contents:'const R=globalThis.__uiFixture.React; export default R; export const useState=globalThis.__uiFixture.useState; export const useEffect=()=>{}; export const useRef=()=>({current:null}); export const useId=()=>"test-id";'}));}
 }}]});
 const m={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(require,m,m.exports);return m.exports;
}
globalThis.__uiFixture={context,auth,React};
try {
 await test('all authenticated routes render without live data and have a main landmark',async()=>{
  for(const name of ['Dashboard','Passport','AiNavigator','FindCare','Appointments','Timeline','Messages','Profile']) {
   const component=(await bundle(`src/pages/${name}Page.tsx`))[`${name}Page`];
   const html=renderToStaticMarkup(React.createElement(component));
   assert.match(html,/<main\b/);assert.match(html,/id="app-navigation"/);assert.match(html,/Skip to content/);
   assert.doesNotMatch(html,/HIPAA-compliant|verified security|Joining secure HIPAA|badge-count">1/);
   const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size,`${name}: duplicate IDs`);
   for(const [,target] of html.matchAll(/aria-controls="([^"]+)"/g)) assert.ok(ids.includes(target),`${name}: unresolved control`);
  }
 });
 await test('authentication modes expose honest states and accessible inputs',async()=>{
  const {AuthPage}=await bundle('src/pages/AuthPage.tsx');
  for(const mode of ['signin','signup','forgot']){
   const html=renderToStaticMarkup(React.createElement(AuthPage,{initialMode:mode}));
   assert.match(html,/<h1/);assert.doesNotMatch(html,/recovery instructions have been sent|Check your email|verified security/);
   if(mode==='forgot'){assert.match(html,/No email has been sent/);assert.doesNotMatch(html,/<form/);}else{assert.match(html,/autoComplete="email"/);assert.match(html,/aria-label="Show password"/);}
  }
 });
 await test('loading and API failures never render a fabricated empty patient overview',async()=>{
  const {DashboardPage}=await bundle('src/pages/DashboardPage.tsx');
  context.isPassportLoading=true;
  assert.match(renderToStaticMarkup(React.createElement(DashboardPage)),/Loading your overview/);
  context.isPassportLoading=false;context.passportError='Fixture load failure';
  const html=renderToStaticMarkup(React.createElement(DashboardPage));assert.match(html,/role="alert"/);assert.doesNotMatch(html,/metric-val/);context.passportError='';
 });
 await test('dashboard shows actual profile fields and never confirms personal visit plans',async()=>{
  const {DashboardPage}=await bundle('src/pages/DashboardPage.tsx');
  auth.user={name:'Synthetic Patient',email:'fixture@example.test',phone:'',dob:'',bloodGroup:null,emergencyContact:{name:'Emergency Fixture',relationship:'Sibling',phone:'fixture-phone'},insurance:{provider:''}};
  context.passport={...emptyPassport,allergies:[{id:'a',allergen:'Fixture allergen',severity:'Mild'}],medications:[{id:'m',name:'Fixture medication',dosage:'fixture dose',status:'Active'}]};
  context.appointments=[{id:'late',providerName:'Later fixture',date:'2099-12-31',time:'14:00',status:'upcoming'},{id:'early',providerName:'Earlier fixture',date:'2099-01-01',time:'10:00',status:'upcoming'},{id:'old',providerName:'Past fixture',date:'2000-01-01',status:'upcoming'},{id:'cancelled',providerName:'Cancelled fixture',date:'2099-01-01',status:'cancelled'}];
  const html=renderToStaticMarkup(React.createElement(DashboardPage));
  for(const value of ['Emergency Fixture','Sibling','fixture-phone','Fixture allergen','Fixture medication','Not provided.','56%'])assert.ok(html.includes(value),value);
  assert.ok(html.indexOf('Earlier fixture')<html.indexOf('Later fixture'));
  assert.doesNotMatch(html,/Past fixture|Cancelled fixture|>Confirmed</);
  auth.user=null;context.appointments=[];context.passport=emptyPassport;
 });
 await test('auth submit handlers wait for backend confirmation and preserve failure feedback',async()=>{
  let slots=[],cursor=0;globalThis.__uiFixture.useState=initial=>{const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value;}];};
  const {AuthPage}=await bundle('src/pages/AuthPage.tsx',{hooks:true});
  const render=mode=>{cursor=0;return AuthPage({initialMode:mode});};
  const nodes=tree=>{const result=[];const walk=n=>{if(!n||typeof n!=='object')return;if(Array.isArray(n)){n.forEach(walk);return;}result.push(n);walk(n.props?.children);};walk(tree);return result;};
  for(const mode of ['signin','signup']){
   slots=[];let all=nodes(render(mode));
   for(const n of all){if(n.props?.label==='Email address')n.props.onChange({target:{value:'fixture@example.test'}});if(n.props?.label==='Full name')n.props.onChange({target:{value:'Synthetic Fixture'}});if(n.props?.id==='auth-password')n.props.onChange({target:{value:'synthetic-password'}});}
   const navigated=[];context.navigate=route=>navigated.push(route);let resolve;auth.login=auth.register=()=>new Promise(r=>{resolve=r;});
   const pending=nodes(render(mode)).find(n=>n.type==='form').props.onSubmit({preventDefault(){}});
   assert.deepEqual(navigated,[]);assert.equal(nodes(render(mode)).find(n=>n.type==='form').props['aria-busy'],true);
   resolve();await pending;assert.deepEqual(navigated,['dashboard']);
   auth.login=auth.register=async()=>{throw new Error('Synthetic authentication rejected');};navigated.length=0;
   await nodes(render(mode)).find(n=>n.type==='form').props.onSubmit({preventDefault(){}});
   assert.deepEqual(navigated,[]);assert.ok(nodes(render(mode)).some(n=>n.props?.message==='Synthetic authentication rejected'));
  }
 });
 await test('sidebar buttons preserve every authenticated navigation destination',async()=>{
  const {Sidebar}=await bundle('src/components/Sidebar.tsx');
  const targets=[];context.navigate=route=>targets.push(route);
  const walk=n=>{if(!n||typeof n!=='object')return;if(Array.isArray(n)){n.forEach(walk);return;}if(n.type==='button' && n.props.className?.includes('sidebar-link') && n.props.onClick)n.props.onClick();walk(n.props?.children);};
  walk(Sidebar({collapsed:false,onToggle(){}}));
  for(const route of ['dashboard','ai-navigator','find-care','passport','appointments','timeline','messages','profile'])assert.ok(targets.includes(route),route);
 });
 await test('responsive and reduced-motion styles parse with no remote media',()=>{
  const css=readFileSync('css/ui2.css','utf8');const tree=postcss.parse(css);const media=[];tree.walkAtRules('media',r=>media.push(r.params));
  for(const width of [1100,800,600,359])assert.ok(media.some(m=>m.includes(`max-width:${width}px`)));
  assert.ok(media.some(m=>m.includes('prefers-reduced-motion')));assert.match(css,/safe-area-inset-bottom/);assert.match(css,/:focus-visible/);assert.doesNotMatch(css,/url\(https?:/);
 });
} finally {delete globalThis.__uiFixture;globalThis.fetch=originalFetch;}
console.log('UI checks use synthetic fixtures only. They do not validate browser layout, real authentication, or keyboard focus behavior.');
