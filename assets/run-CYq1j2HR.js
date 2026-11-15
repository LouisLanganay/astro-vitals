import{A as e,C as t,D as n,E as r,O as i,S as a,T as o,_ as s,a as c,b as l,c as u,d,f,g as p,h as m,i as h,k as g,l as _,m as v,o as y,p as b,s as x,t as S,u as C,v as w,w as T,x as E,y as D}from"./index-DS109vrM.js";var O=-5.5,k=[0,0,-.25],A=2,j=3,M=4,N=5,P=[{id:1,anchor:[0,0,5],samples:[[0,0,5],[0,0,4.5],[0,0,4]],radius:.85},{id:A,anchor:[0,0,2.2],samples:[[0,0,3],[0,0,2.4],[0,0,1.8],[0,0,1.2]],radius:1.3},{id:j,anchor:[0,2.7,-1],samples:((e,t,n)=>Array.from({length:e},(r,i)=>{let a=i/e*Math.PI*2;return[t*Math.cos(a),t*Math.sin(a),n]}))(20,2.7,-1),radius:.5},{id:M,anchor:[2.9,0,-3.95],samples:[[1.8,0,-3.95],[2.9,0,-3.95],[4,0,-3.95]],radius:.7},{id:M,anchor:[-2.9,0,-3.95],samples:[[-1.8,0,-3.95],[-2.9,0,-3.95],[-4,0,-3.95]],radius:.7},{id:N,anchor:[0,0,-4],samples:[[0,0,-3.4],[0,0,-4],[0,0,-4.6],[0,0,-5.2]],radius:1}],F=Math.PI*2,I=0,L=1,R=2,ee=3,z=0,te=1,ne=2,B=.1,V=.054,H=.985,U=[[5,.72],[4.2,.72],[3.4,1.25],[.9,1.25],[.3,.34],[-2.9,.34],[-3.2,.9],[-4.7,.9],[-4.85,.42],[O,.8]],W={z:-1,major:2.7,minor:.34},G={z0:-4.55,z1:-3.35,from:1.3,length:1,gap:.08,count:3},re=6;function K(e){let t=e>>>0;return()=>{t=t+1831565813>>>0;let e=t;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}}var q=class{out=[];quad(e,t,n,r){this.out.push(...e,...t,...n,...e,...n,...r)}band(e,t,n,r,i=40){for(let a=0;a<i;a++){let o=a/i*F,s=(a+1)/i*F;this.quad([n*Math.cos(o),n*Math.sin(o),e],[n*Math.cos(s),n*Math.sin(s),e],[r*Math.cos(s),r*Math.sin(s),t],[r*Math.cos(o),r*Math.sin(o),t])}}torus(e,t,n,r=56,i=12){let a=(a,o)=>{let s=a/i*F,c=o/r*F,l=t+n*Math.cos(s);return[l*Math.cos(c),l*Math.sin(c),e+n*Math.sin(s)]};for(let e=0;e<i;e++)for(let t=0;t<r;t++)this.quad(a(e,t),a(e,t+1),a(e+1,t+1),a(e+1,t))}},ie=class{out=[];zone=0;random=K(20261114);add(e,t,n={}){this.out.push(e[0],e[1],e[2],t[0],t[1],t[2],n.size??V,this.random(),n.aux??0,this.zone,+!!n.spin,n.accent??0,n.group??I,n.side??z)}get count(){return this.out.length/14}};function ae(e,t,n,r,i,a={},o=!1,s=B,c=!1){let l=Math.max(1,Math.round(Math.hypot(n-t,i-r)/(s*.866))),u=(i-r)/(n-t),d=(o?-1:1)/Math.hypot(1,u),f=c?l:l-1;for(let o=0;o<=f;o++){let c=o/l,f=t+(n-t)*c,p=r+(i-r)*c,m=Math.max(6,Math.round(F*p/s)),h=o%2*.5;for(let t=0;t<m;t++){let n=(t+h)/m*F,r=Math.cos(n),i=Math.sin(n);e.add([p*r,p*i,f],[d*r,d*i,-d*u],a)}}}function J(e,t,n,r,i,a={},o=B){let s=Math.max(1,Math.round((r-n)/(o*.866)));for(let c=0;c<=s;c++){let l=n+(r-n)*c/s,u=l<o/2?1:Math.max(6,Math.round(F*l/o)),d=c%2*.5;for(let n=0;n<u;n++){let r=(n+d)/u*F;e.add([l*Math.cos(r),l*Math.sin(r),t],[0,0,i],a)}}}function Y(e,t,n,r,i,a){for(let o=0;o<r;o++){let s=o/r*F;e.add([n*Math.cos(s),n*Math.sin(s),t],i(s),a(s))}}function oe(e,t,n,r,i={}){let a=Math.max(8,Math.round(F*r/B));for(let o=0;o<a;o++){let s=o/a*F,c=Math.cos(s),l=Math.sin(s),u=n+r*c,d=Math.round(F*u/B),f=o%2*.5;for(let n=0;n<d;n++){let a=(n+f)/d*F,o=Math.cos(a),s=Math.sin(a);e.add([u*o,u*s,t+r*l],[c*o,c*s,l],i)}}}function se(e,t,n,r,i,a={}){let o=Math.sign(n-t),s=Math.round(Math.abs(n-t)/B),c=Math.round((i-r)/(B*.866));for(let n=0;n<=c;n++){let l=r+(i-r)*n/c,u=n%2*.5;for(let n=0;n<s;n++)e.add([t+o*(n+u)*B,0,l],[0,1,0],{...a,side:te})}}function ce(e,t,n,r={}){let i=Math.hypot(n[0]-t[0],n[1]-t[1],n[2]-t[2]),a=Math.max(2,Math.round(i/(B*.8)));for(let i=0;i<=a;i++){let o=i/a;e.add([t[0]+(n[0]-t[0])*o,t[1]+(n[1]-t[1])*o,t[2]+(n[2]-t[2])*o],[0,1,0],{...r,side:ne})}}function le(e){let t=.6,n=Math.round(t/(B*.8)),r=F/re;for(let i=0;i<=n;i++){let a=t*i/n,o=i===0?1:Math.round(F*a/(B*.8));for(let t=0;t<o;t++){let n=(t+.5)/o*F,s=Math.floor(n/r),c=Math.min(n-s*r,(s+1)*r-n);i>0&&c*a<.022||e.add([a*Math.cos(n),a*Math.sin(n),5],[0,0,1],{group:ee,aux:(s+.5)*r,size:V*.9})}}}function ue(e,t){let n=e=>[Math.cos(e),Math.sin(e),0],r=[1,1,A,A,j,N,N,N,N];e.zone=1,le(e),J(e,5,.62,.72,1),Y(e,5.02,.67,24,()=>[0,0,1],e=>({accent:2,aux:e,size:V*1.25}));for(let n=0;n<U.length-1;n++){let[i,a]=U[n],[o,s]=U[n+1];e.zone=r[n],ae(e,i,o,a,s,{},!1,B,n===U.length-2),t.band(i,o,a*H,s*H)}e.zone=A,Y(e,2.75,1.262,14,n,()=>({accent:1,size:V*1.5})),Y(e,1.55,1.262,14,n,()=>({accent:1,size:V*1.5})),e.zone=N,Y(e,-3.95,.912,10,n,()=>({accent:1,size:V*1.3})),e.zone=j,oe(e,W.z,W.major,W.minor,{spin:!0}),t.torus(W.z,W.major,W.minor*H),Y(e,W.z,W.major+W.minor+.012,32,n,()=>({accent:1,spin:!0,size:V*1.3}));for(let t=0;t<4;t++){let n=t/4*F+F/8,r=Math.cos(n),i=Math.sin(n);for(let t of[-.07,.07])ce(e,[.36*r,.36*i,W.z+t],[2.38*r,2.38*i,W.z+t],{spin:!0,size:V*.85})}e.zone=M;for(let n of[-1,1]){ce(e,[n*.9,0,-3.95],[n*G.from,0,-3.95],{size:V*.85});for(let r=0;r<G.count;r++){let i=n*(G.from+r*(G.length+G.gap)),a=i+n*G.length;se(e,i,a,G.z0,G.z1),t.quad([i,0,G.z0],[a,0,G.z0],[a,0,G.z1],[i,0,G.z1])}}}function de(e){e.zone=0;let t={group:L,size:V*.9},n=e=>e>4.2?.6:e>3.4?.6+(4.2-e)/.8*.5:1.1,r=0;for(let i=4.9;i>-7;i-=.36){let a=n(i),o=Math.round(F*a/.075),s=r%3==0;for(let n=0;n<o;n++){let r=n/o*F;e.add([a*Math.cos(r),a*Math.sin(r),i],[-Math.cos(r),-Math.sin(r),0],{...t,accent:+!!s})}r+=1}for(let r=0;r<6;r++){let i=r/6*F+F/12;for(let r=4.9;r>-7;r-=.09){let a=n(r)*.985;e.add([a*Math.cos(i),a*Math.sin(i),r],[-Math.cos(i),-Math.sin(i),0],{...t,accent:2,aux:-r*2.6,size:V*.8})}}J(e,-7,0,1.1,1,{...t,accent:1,size:V*1.1},.085)}function fe(e){for(let t=0;t<2400;t++){let t=e.random()*2-1,n=e.random()*F,r=Math.sqrt(1-t*t),i=e.random()**3;e.add([r*Math.cos(n),r*Math.sin(n),t],[0,0,1],{group:R,size:1+i*1.6,aux:.25+i*.75})}}function pe(){let e=new ie,t=new q;ue(e,t);let n=e.count;fe(e);let r=e.count;return de(e),{data:new Float32Array(e.out),count:e.count,solid:n,outside:r,mesh:new Float32Array(t.out)}}var X=Math.PI*2,Z=.62,me=1.16,he=Ae([-.52,.66,.54]),ge=1.35,_e=1.45,ve=1.7,ye=9.2,be=-4.4,xe=4.2,Se=.2,Ce={az:.76,el:.3,roll:0,rect:[.4,.07,1.04,.93]},we={az:.66,el:.36,roll:-.42,rect:[.05,.1,1.16,.6]},Te=.05,Ee=`
attribute vec3 aPos;
uniform mat4 uView;
uniform mat4 uProj;
uniform vec2 uShift;

void main() {
  gl_Position = uProj * uView * vec4(aPos, 1.0);
  gl_Position.xy += uShift * gl_Position.w;
}
`,De=`
void main() {
  gl_FragColor = vec4(0.0);
}
`,Oe=`
const float NOSE = ${5 .toFixed(1)};
const float BIAS = ${Te};
attribute vec3 aPos;
attribute vec3 aNrm;
attribute vec4 aA;
attribute vec4 aB;
uniform mat4 uView;
uniform mat4 uProj;
uniform vec3 uEye;
uniform vec3 uLight;
uniform vec2 uShift;
uniform float uTime;
uniform float uSpin;
uniform float uOpen;
uniform float uInside;
uniform float uReveal;
uniform float uScale;
uniform float uMinPx;
uniform float uMaxPx;
uniform float uZone;
uniform float uGlow;
uniform float uHole;
uniform float uAspect;
varying float vAlpha;
varying float vLit;
varying float vAccent;

void main() {
  vec3 p = aPos;
  vec3 n = aNrm;
  float group = aB.z;
  float accent = aB.y;
  float alpha = 1.0;
  float lit = 1.0;
  float px = 1.0;
  float hot = (1.0 - step(0.5, abs(aA.w - uZone))) * uGlow;
  vec4 mv;

  if (aB.x > 0.5) {
    float c = cos(uSpin);
    float s = sin(uSpin);
    p.xy = vec2(c * p.x - s * p.y, s * p.x + c * p.y);
    n.xy = vec2(c * n.x - s * n.y, s * n.x + c * n.y);
  }

  if (group > 1.5 && group < 2.5) {
    mv = vec4((uView * vec4(p, 0.0)).xyz, 1.0);
    alpha = aA.z * (0.6 + 0.4 * sin(uTime * (0.5 + aA.y * 1.6) + aA.y * 50.0)) * uReveal * (1.0 - uInside);
    lit = 0.6;
    px = aA.x * uMinPx;
  } else {
    if (group > 2.5) {
      p.xy += vec2(cos(aA.z), sin(aA.z)) * uOpen * 0.66;
      alpha *= 1.0 - smoothstep(0.5, 1.0, uOpen);
    }
    mv = uView * vec4(p, 1.0);
    float depth = max(-mv.z, 0.0001);
    float facing = dot(n, normalize(uEye - p));
    float lam = dot(n, uLight);
    bool inner = group > 0.5 && group < 1.5;
    if (inner || aB.w > 1.5) {
      facing = 1.0;
      lam = 0.1;
    } else if (aB.w > 0.5) {
      facing = abs(facing);
      lam = abs(lam);
    }
    float hl = lam * 0.5 + 0.5;
    lit = clamp(hl * hl + pow(1.0 - clamp(facing, 0.0, 1.0), 3.0) * 0.3, 0.0, 1.0);
    alpha *= smoothstep(-0.05, 0.3, facing);
    float grow = 1.0;
    if (inner) {
      float mask = 1.0;
      if (uEye.z > NOSE) {
        vec2 q = uEye.xy + (p.xy - uEye.xy) * (uEye.z - NOSE) / max(uEye.z - p.z, 0.0001);
        float hole = uOpen * 0.57;
        mask = (1.0 - smoothstep(hole * 0.84, hole, length(q))) * step(0.001, uOpen);
      }
      alpha *= mask * exp(-depth * 0.15);
      lit = 0.5;
    } else {
      float k = clamp((uReveal * 1.35 - (5.0 - aPos.z) / 10.5 - aA.y * 0.12) / 0.16, 0.0, 1.0);
      alpha *= k * mix(0.5, 1.0, lit);
      grow = mix(2.6, 1.0, k);
    }
    if (accent > 1.5) {
      float w = 0.5 + 0.5 * cos(aA.z - uTime * 2.6);
      alpha *= 0.3 + 0.7 * w * w * w;
      lit = 1.0;
    } else if (accent > 0.5) {
      alpha *= 0.72 + 0.28 * sin(uTime * 1.4 + aA.y * 6.2832);
      lit = 1.0;
    }
    alpha *= smoothstep(0.08, 0.8, depth) * (1.0 + 0.5 * hot);
    lit = mix(lit, 1.0, 0.45 * hot);
    px = aA.x * grow * (0.78 + 0.34 * lit) * (1.0 + 0.16 * hot) * uScale / depth;
  }

  float ratio = min(1.0, px / uMinPx);
  gl_PointSize = min(max(px, uMinPx), uMaxPx);
  gl_Position = uProj * mv;
  if (group > 1.5 && group < 2.5) {
    gl_Position.z = 0.9999 * gl_Position.w;
  } else {
    vec4 front = uProj * vec4(mv.xy, mv.z + BIAS, 1.0);
    gl_Position.z = front.z / front.w * gl_Position.w;
  }
  gl_Position.xy += uShift * gl_Position.w;
  vAlpha = alpha * ratio * ratio;
  if (uHole > 0.0 && gl_Position.w > 0.0) {
    vec2 q = gl_Position.xy / gl_Position.w * vec2(uAspect, 1.0);
    float rim = length(q) - uHole;
    q += normalize(q + 0.00001) * exp(-max(rim, 0.0) * 5.0) * 0.1 * step(0.0, rim);
    vAlpha *= 1.0 + 1.8 * exp(-abs(rim) * 9.0);
    gl_Position.xy = q / vec2(uAspect, 1.0) * gl_Position.w;
  }
  vLit = lit;
  vAccent = max(step(0.5, accent), 0.62 * hot);
}
`,ke=`
precision mediump float;
uniform vec3 uLo;
uniform vec3 uHi;
uniform vec3 uAcc;
varying float vAlpha;
varying float vLit;
varying float vAccent;

void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.36, d) * vAlpha;
  if (a < 0.004) discard;
  vec3 col = mix(mix(uLo, uHi, vLit), uAcc, vAccent);
  gl_FragColor = vec4(col * a, a);
}
`;function Ae(e){let t=Math.hypot(e[0],e[1],e[2])||1;return[e[0]/t,e[1]/t,e[2]/t]}var Q=e=>Math.max(0,Math.min(1,e)),$=(e,t,n)=>e+(t-e)*n,je=(e,t,n)=>{let r=Q((n-e)/(t-e));return r*r*(3-2*r)},Me=e=>1-(1-e)**3,Ne=e=>e<.5?4*e*e*e:1-(-2*e+2)**3/2;function Pe(e,t,n){return[k[0]+Math.sin(e)*Math.cos(t)*n,k[1]+Math.sin(t)*n,k[2]+Math.cos(e)*Math.cos(t)*n]}function Fe(e,t,n,r){let i=Ae([n[0]-t[0],n[1]-t[1],n[2]-t[2]]),a=Ae([-i[2],0,i[0]]),o=[a[1]*i[2]-a[2]*i[1],a[2]*i[0]-a[0]*i[2],a[0]*i[1]-a[1]*i[0]],s=Math.cos(r),c=Math.sin(r),l=a[0]*s+o[0]*c,u=a[1]*s+o[1]*c,d=a[2]*s+o[2]*c,f=o[0]*s-a[0]*c,p=o[1]*s-a[1]*c,m=o[2]*s-a[2]*c;e[0]=l,e[1]=f,e[2]=-i[0],e[3]=0,e[4]=u,e[5]=p,e[6]=-i[1],e[7]=0,e[8]=d,e[9]=m,e[10]=-i[2],e[11]=0,e[12]=-(l*t[0]+u*t[1]+d*t[2]),e[13]=-(f*t[0]+p*t[1]+m*t[2]),e[14]=i[0]*t[0]+i[1]*t[1]+i[2]*t[2],e[15]=1}function Ie(e,t,n,r,i){e.fill(0),e[0]=t/n,e[5]=t,e[10]=(i+r)/(r-i),e[11]=-1,e[14]=2*i*r/(r-i)}function Le(e,t){let n=getComputedStyle(document.documentElement).getPropertyValue(e).trim(),r=/^#([0-9a-f]{6})$/i.exec(n);if(!r)return t;let i=parseInt(r[1],16);return[(i>>16)/255,(i>>8&255)/255,(i&255)/255]}function Re(){let e=document.documentElement.getAttribute(`data-theme`)===`light`;return{light:e,bg:Le(`--bg`,[0,0,0]),lo:Le(e?`--faint`:`--dot-2`,[.42,.42,.45]),hi:Le(`--fg`,[.96,.96,.97]),acc:Le(`--ui`,[.55,.42,1])}}function ze(e,t){let n=e.getContext(`webgl`,{alpha:!1,antialias:!1,depth:!0,stencil:!1,powerPreference:`high-performance`});if(!n)return null;let r=Re(),i=[`uView`,`uProj`,`uEye`,`uLight`,`uShift`,`uTime`,`uSpin`,`uOpen`,`uInside`,`uReveal`,`uScale`,`uMinPx`,`uMaxPx`,`uLo`,`uHi`,`uAcc`,`uZone`,`uGlow`,`uHole`,`uAspect`],a=null,o=null,s=null,c=null,l={},u={},d=1,f=1,p=64;function m(e,t,r){let i=n.createProgram();for(let[r,a]of[[n.VERTEX_SHADER,e],[n.FRAGMENT_SHADER,t]]){let e=n.createShader(r);n.shaderSource(e,a),n.compileShader(e),n.attachShader(i,e)}return r.forEach((e,t)=>n.bindAttribLocation(i,t,e)),n.linkProgram(i),n.getProgramParameter(i,n.LINK_STATUS)?i:null}function h(){if(a=m(Oe,ke,[`aPos`,`aNrm`,`aA`,`aB`]),o=m(Ee,De,[`aPos`]),!a||!o)return!1;s=n.createBuffer(),n.bindBuffer(n.ARRAY_BUFFER,s),n.bufferData(n.ARRAY_BUFFER,t.data,n.STATIC_DRAW),c=n.createBuffer(),n.bindBuffer(n.ARRAY_BUFFER,c),n.bufferData(n.ARRAY_BUFFER,t.mesh,n.STATIC_DRAW),l=Object.fromEntries(i.map(e=>[e,n.getUniformLocation(a,e)])),u=Object.fromEntries([`uView`,`uProj`,`uShift`].map(e=>[e,n.getUniformLocation(o,e)])),n.useProgram(a),n.uniform3fv(l.uLight,he),n.uniform3fv(l.uLo,r.lo),n.uniform3fv(l.uHi,r.hi),n.uniform3fv(l.uAcc,r.acc),n.blendFunc(n.ONE,r.light?n.ONE_MINUS_SRC_ALPHA:n.ONE),n.depthFunc(n.LEQUAL),n.clearColor(r.bg[0],r.bg[1],r.bg[2],1);let e=n.getParameter(n.ALIASED_POINT_SIZE_RANGE);return p=Math.min(e?e[1]:64,160),!0}if(!h())return null;let g=e=>{e.preventDefault(),a=null},_=()=>{h(),n.viewport(0,0,e.width,e.height)};return e.addEventListener(`webglcontextlost`,g),e.addEventListener(`webglcontextrestored`,_),{resize(t,r,i){d=r,f=i,e.width=Math.max(1,Math.round(t*i)),e.height=Math.max(1,Math.round(r*i)),n.viewport(0,0,e.width,e.height)},draw(e){if(a&&o){n.depthMask(!0),n.clear(n.COLOR_BUFFER_BIT|n.DEPTH_BUFFER_BIT),n.useProgram(o),n.bindBuffer(n.ARRAY_BUFFER,c),n.enableVertexAttribArray(0);for(let e of[1,2,3])n.disableVertexAttribArray(e);n.vertexAttribPointer(0,3,n.FLOAT,!1,12,0),n.uniformMatrix4fv(u.uView,!1,e.view),n.uniformMatrix4fv(u.uProj,!1,e.proj),n.uniform2f(u.uShift,e.shiftX,e.shiftY),n.enable(n.DEPTH_TEST),n.disable(n.BLEND),n.colorMask(!1,!1,!1,!1),n.drawArrays(n.TRIANGLES,0,t.mesh.length/3),n.useProgram(a),n.bindBuffer(n.ARRAY_BUFFER,s),[3,3,4,4].forEach((e,t)=>{n.enableVertexAttribArray(t),n.vertexAttribPointer(t,e,n.FLOAT,!1,56,[0,12,24,40][t])}),n.uniformMatrix4fv(l.uView,!1,e.view),n.uniformMatrix4fv(l.uProj,!1,e.proj),n.uniform3fv(l.uEye,e.eye),n.uniform2f(l.uShift,e.shiftX,e.shiftY),n.uniform1f(l.uTime,e.time),n.uniform1f(l.uSpin,e.spin),n.uniform1f(l.uOpen,e.open),n.uniform1f(l.uInside,e.inside),n.uniform1f(l.uReveal,e.reveal),n.uniform1f(l.uScale,d*f*e.focal/2),n.uniform1f(l.uMinPx,1.7*f),n.uniform1f(l.uMaxPx,p),n.uniform1f(l.uZone,e.zone),n.uniform1f(l.uGlow,e.glow),n.uniform1f(l.uHole,e.hole),n.uniform1f(l.uAspect,e.aspect),n.colorMask(!0,!0,!0,!0),n.depthMask(!1),n.enable(n.BLEND),n.drawArrays(n.POINTS,0,t.outside),n.disable(n.DEPTH_TEST),n.drawArrays(n.POINTS,t.outside,t.count-t.outside)}},dispose(){e.removeEventListener(`webglcontextlost`,g),e.removeEventListener(`webglcontextrestored`,_),n.getExtension(`WEBGL_lose_context`)?.loseContext()}}}function Be(e,t,n){let r=e.getContext(`2d`);if(!r)return null;let i=Re(),a=e=>`rgb(${Math.round(e[0]*255)}, ${Math.round(e[1]*255)}, ${Math.round(e[2]*255)})`,o=Array.from({length:12},(e,t)=>a([0,1,2].map(e=>$(i.lo[e],i.hi[e],t/11)))),s=a(i.acc),c=1,l=1,u=1;return{resize(t,n,r){c=t,l=n,u=r,e.width=Math.max(1,Math.round(t*r)),e.height=Math.max(1,Math.round(n*r))},draw(e){let d=e.view,f=l*e.focal/2,p=Math.cos(e.spin),m=Math.sin(e.spin);r.setTransform(u,0,0,u,0,0),r.globalAlpha=1,r.fillStyle=a(i.bg),r.fillRect(0,0,c,l);for(let i=0;i<n;i++){let n=i*14,a=t[n+12];if(a===1)continue;let u=t[n],h=t[n+1],g=t[n+2],_=t[n+3],v=t[n+4],y=t[n+5],b=1,x=.6,S=.85,C,w,T;if(a===2)C=d[0]*u+d[4]*h+d[8]*g,w=d[1]*u+d[5]*h+d[9]*g,T=d[2]*u+d[6]*h+d[10]*g,b=t[n+8]*.8,S=t[n+6]*.6;else{t[n+10]>.5&&([u,h]=[p*u-m*h,m*u+p*h],[_,v]=[p*_-m*v,m*_+p*v]),C=d[0]*u+d[4]*h+d[8]*g+d[12],w=d[1]*u+d[5]*h+d[9]*g+d[13],T=d[2]*u+d[6]*h+d[10]*g+d[14];let r=e.eye[0]-u,i=e.eye[1]-h,a=e.eye[2]-g,o=(_*r+v*i+y*a)/(Math.hypot(r,i,a)||1),s=_*he[0]+v*he[1]+y*he[2],c=t[n+13];c>1.5?(o=1,s=.1):c>.5&&(o=Math.abs(o),s=Math.abs(s));let l=s*.5+.5;x=Q(l*l+(1-Q(o))**3*.3),b=je(-.05,.3,o)*$(.4,1,x),t[n+11]>.5&&(x=1),S=Math.max(.85,t[n+6]*(.72+.5*x)*f/-T/2)}if(T>=-.05||b<.02)continue;let E=(e.focal/e.aspect*C/-T+e.shiftX+1)*.5*c,D=(1-(e.focal*w/-T+e.shiftY))*.5*l;E<-4||D<-4||E>c+4||D>l+4||(r.globalAlpha=b,r.fillStyle=t[n+11]>.5?s:o[Math.round(x*11)],r.beginPath(),r.arc(E,D,S,0,X),r.fill())}},dispose(){}}}function Ve(e,t){let n=pe(),r=ze(e,n),i=r??Be(e,n.data,n.count),a=r!==null&&!t.reduced,o=new Float32Array(16),s=new Float32Array(16),c=new Float32Array(16),l=1,u=1,d={az:Ce.az,el:Ce.el,roll:0,dist:20,shiftX:0,shiftY:0},f=0,p=0,m=0,h=-1,g={az:0,el:0,dist:0},_=null,v=0,y=0,b=0,x=0,S=!1,C=0,w=-1,T=0,E=0,D={focal:1,aspect:1,shiftX:0,shiftY:0};function O(e){let t=-(o[2]*e[0]+o[6]*e[1]+o[10]*e[2]+o[14]),n=D.focal/D.aspect*(o[0]*e[0]+o[4]*e[1]+o[8]*e[2]+o[12])/t,r=D.focal*(o[1]*e[0]+o[5]*e[1]+o[9]*e[2]+o[13])/t;return{x:(n+D.shiftX+1)*.5*l,y:(1-r-D.shiftY)*.5*u,unit:t>0?u/2*D.focal/t:0}}function A(e,t){let n=1,r=0;return P.forEach((i,a)=>{for(let o of i.samples){let s=O(o);if(s.unit<=0)continue;let c=Math.hypot(s.x-e,s.y-t)/(i.radius*s.unit);c<n&&(n=c,r=a+1)}}),r}function j(e,t,r){Fe(c,Pe(d.az,d.el,e),k,d.roll);let i=n.data,a=1/0,o=-1/0,s=1/0,l=-1/0;for(let e=0;e<n.solid;e+=3){let n=e*14,u=i[n],d=i[n+1],f=i[n+2],p=c[2]*u+c[6]*d+c[10]*f+c[14];if(p>-.1)continue;let m=t/r*(c[0]*u+c[4]*d+c[8]*f+c[12])/-p,h=t*(c[1]*u+c[5]*d+c[9]*f+c[13])/-p;m<a&&(a=m),m>o&&(o=m),h<s&&(s=h),h>l&&(l=h)}return{x0:a,x1:o,y0:s,y1:l}}function M(){let e=l/u,n=1/Math.tan(Z/2),r=e>1.05,i=r?Ce:we,[a,o,s,c]=t.frame?.(r)??i.rect;d={az:i.az,el:i.el,roll:i.roll,dist:22,shiftX:0,shiftY:0};for(let t=0;t<7;t++){let t=j(d.dist,n,e);d.dist*=Math.max((t.x1-t.x0)/((s-a)*2),(t.y1-t.y0)/((c-o)*2))}let f=j(d.dist,n,e);d.shiftX=a+s-1-(f.x0+f.x1)/2,d.shiftY=1-(o+c)-(f.y0+f.y1)/2}function N(){let e=f,n=l/u,r=a?Me(Q(e/2.6)):1,i=d.az+(1-r)*.42,c=d.el+(1-r)*.08,p=d.dist*(1+(1-r)*.16);a&&(i+=Math.sin(e*.19)*.085+v*.1,c+=Math.sin(e*.15+1.3)*.04-y*.06);let m=k,_=Pe(i,c,p),b=d.roll,x=Z,S=1,A=0,j=0;if(h>=0){let t=e-h,n=Ne(Q(t/ge));if(_=Pe($(g.az,0,n),$(g.el,0,n),$(g.dist,ye-k[2],n)),m=[0,0,$(k[2],5,n)],b=d.roll*(1-n)-Math.sin(n*Math.PI)*.11,S=1-n,A=Ne(Q((t-.7)/.85)),t>ge){let e=Q((t-ge)/_e),n=Math.max(0,t-ge-_e),r=$(ye,be,e*e*e)-ve*(1-Math.exp(-n*2.4));_=[0,0,r],m=[0,0,r-xe],x=$(Z,me,e*e),b=Ne(e)*.7+n*.35,j=je(6.2,4.4,r)}}else g={az:i,el:c,dist:p};let M=1/Math.tan(x/2),N=Math.hypot(_[0]-k[0],_[1]-k[1],_[2]-k[2]),F=Math.max(.05,N-8.5);if(Fe(o,_,m,b),Ie(s,M,n,F,N+14),D={focal:M,aspect:n,shiftX:d.shiftX*S,shiftY:d.shiftY*S},h>=0&&(C=0),C>0&&(w=P[C-1].id),C>0&&t.onzone){let e=O(P[C-1].anchor);t.onzone(e.x,e.y)}if(t.onanchor){let e=o[10]*5+o[14],i=M/n*(o[8]*5+o[12])/-e+d.shiftX*S,a=M*(o[9]*5+o[13])/-e+d.shiftY*S,s=h>=0?0:je(.75,1,r);t.onanchor((i+1)*.5*l,(1-a)*.5*u,s)}return{view:o,proj:s,eye:_,focal:M,aspect:n,near:F,shiftX:d.shiftX*S,shiftY:d.shiftY*S,time:a?e:0,spin:a?e*Se:.4,open:A,inside:j,reveal:a?Q((e-.1)/1.9):1,zone:w,glow:T,hole:E/(u/2)}}function F(){i?.draw(N())}function I(e){if(m=0,!S){if(f+=Math.min(.05,(e-p)/1e3),p=e,v+=(b-v)*.045,y+=(x-y)*.045,T+=(+(C>0)-T)*.16,F(),h>=0){let e=f-h;_&&e>=2.6999999999999997&&(_(),_=null)}m=requestAnimationFrame(I)}}function L(){!a||m||S||document.hidden||(p=performance.now(),m=requestAnimationFrame(I))}let R=new ResizeObserver(()=>{l=Math.max(1,e.clientWidth),u=Math.max(1,e.clientHeight);let t=(window.devicePixelRatio||1)*(window.visualViewport?.scale??1);i?.resize(l,u,Math.min(t,2.5)),M(),F()});R.observe(e);let ee=()=>{document.hidden?(cancelAnimationFrame(m),m=0):L()},z=e=>{e.pointerType===`mouse`&&(b=(e.clientX/window.innerWidth-.5)*2,x=(e.clientY/window.innerHeight-.5)*2)};return document.addEventListener(`visibilitychange`,ee),window.addEventListener(`pointermove`,z,{passive:!0}),L(),{pick(e,t){return h>=0?0:A(e,t)},hole(e){E=e},focus(e){C=e,a||(T=+(e>0),F())},refit(){M(),a||F()},enter(){return!a||h>=0?Promise.resolve():(h=f,L(),new Promise(e=>_=e))},skip(){h<0||!_||(h=f-2.6999999999999997)},destroy(){S=!0,cancelAnimationFrame(m),R.disconnect(),document.removeEventListener(`visibilitychange`,ee),window.removeEventListener(`pointermove`,z),i?.dispose()}}}var He=v(`<div class="landing svelte-1aubhyq"><canvas aria-hidden="true"></canvas> <div class="veil svelte-1aubhyq" aria-hidden="true"></div> <i class="pin svelte-1aubhyq" aria-hidden="true"></i> <div aria-hidden="true"><i class="tip-dot svelte-1aubhyq"></i> <i class="tip-line svelte-1aubhyq"></i> <div class="tip-card svelte-1aubhyq"><span class="ic svelte-1aubhyq"><!></span> <span class="tip-txt svelte-1aubhyq"><b class="svelte-1aubhyq"> </b> <span class="svelte-1aubhyq"> </span></span></div></div> <header class="top svelte-1aubhyq"><span class="mark svelte-1aubhyq"><svg viewBox="0 0 24 24" aria-hidden="true" class="svelte-1aubhyq"><path class="back svelte-1aubhyq" d="M1.8 12A10.2 4 0 0 1 22.2 12" transform="rotate(-24 12 12)"></path><g class="pl svelte-1aubhyq"><circle cx="12" cy="12" r="1.65" class="svelte-1aubhyq"></circle><circle cx="15.75" cy="12" r="1.6" class="svelte-1aubhyq"></circle><circle cx="13.88" cy="15.25" r="1.6" class="svelte-1aubhyq"></circle><circle cx="10.13" cy="15.25" r="1.6" class="svelte-1aubhyq"></circle><circle class="hi svelte-1aubhyq" cx="8.25" cy="12" r="1.6"></circle><circle class="hi svelte-1aubhyq" cx="10.13" cy="8.75" r="1.6"></circle><circle cx="13.88" cy="8.75" r="1.6" class="svelte-1aubhyq"></circle></g><path d="M22.2 12A10.2 4 0 0 1 1.8 12" transform="rotate(-24 12 12)" class="svelte-1aubhyq"></path></svg></span> <span class="name svelte-1aubhyq"><b class="svelte-1aubhyq">Astro Vitals</b> <span class="svelte-1aubhyq">Crew health</span></span></header> <main class="hero svelte-1aubhyq"><p class="eyebrow svelte-1aubhyq">Mars transit</p> <h1 class="svelte-1aubhyq">Welcome on board.</h1> <p class="sub svelte-1aubhyq">Do your health check each day of the flight.</p> <button class="btn violet big svelte-1aubhyq">Enter the ship <svg viewBox="0 0 16 16" aria-hidden="true" class="svelte-1aubhyq"><path d="M3 8h9.5M8.5 3.5 13 8l-4.5 4.5" class="svelte-1aubhyq"></path></svg></button> <p class="note svelte-1aubhyq">Prototype, not a medical device.</p></main> <i class="halo svelte-1aubhyq" aria-hidden="true"></i></div>`);function Ue(f,m){i(m,!0);let v={1:{title:`Airlock`,line:`Select to enter.`,icon:`chevron`},2:{title:`Habitat`,line:`Daily check: sleep, mood, fluid.`,icon:`check`},3:{title:`Gravity ring`,line:`Exercise keeps muscle and bone.`,icon:`dumbbell`},4:{title:`Solar arrays`,line:`120 days of transit to Mars.`,icon:`sun`},5:{title:`Service module`,line:`Rules watch each value.`,icon:`rules`}},S=r(void 0),C=r(void 0),O=r(void 0),k=r(void 0),A=r(`idle`),j=r(void 0),M=r(void 0),N=r(0),F=r(`tr`),I=r(T(v[1])),L=null;function R(e,t,n){w(C)&&(w(C).style.translate=`${e.toFixed(1)}px ${t.toFixed(1)}px`,w(C).style.opacity=n.toFixed(3))}function ee(e,t){if(!w(M))return;w(M).style.translate=`${e.toFixed(1)}px ${t.toFixed(1)}px`;let n=`${t<170?`b`:`t`}${e>window.innerWidth-270?`l`:`r`}`;n!==w(F)&&o(F,n)}function z(e){e!==w(N)&&(o(N,e,!0),e>0&&o(I,v[P[e-1].id],!0),L?.focus(e))}function te(e){w(A)===`idle`&&e.pointerType===`mouse`&&z(L?.pick(e.clientX,e.clientY)??0)}function ne(e){if(w(A)!==`idle`)return;let t=L?.pick(e.clientX,e.clientY)??0;t>0&&P[t-1].id===1?H():z(t===w(N)&&e.pointerType!==`mouse`?0:t)}function B(e){e.pointerType===`mouse`&&z(0)}function V(e){let t=w(k)?.getBoundingClientRect();if(!t)return null;let n=Math.max(.34,Math.min(.5,(t.right+36)/window.innerWidth)),r=Math.max(.4,Math.min(.68,(t.top-30)/window.innerHeight));return e?[n,.07,1.04,.93]:[.05,.1,1.16,r]}y(()=>{L=Ve(w(S),{reduced:c.current,frame:V,onanchor:R,onzone:ee});let e=new ResizeObserver(()=>w(A)===`idle`&&L?.refit());e.observe(w(k));let t=w(S);return t.addEventListener(`pointermove`,te),t.addEventListener(`pointerleave`,B),t.addEventListener(`click`,ne),()=>{e.disconnect(),t.removeEventListener(`pointermove`,te),t.removeEventListener(`pointerleave`,B),t.removeEventListener(`click`,ne),L?.destroy()}});async function H(){w(A)===`leaving`?L?.skip():w(A)===`idle`&&(z(0),o(A,`leaving`),await L?.enter(),m.oncovered(c.current?U:W))}function U(){o(A,`out`),setTimeout(m.ondone,0)}function W(){let e=document.getElementById(`app`);if(!e||!w(j)){U();return}o(A,`opening`);let t=window.innerWidth/2,n=window.innerHeight/2,r=Math.hypot(t,n)+80,i={duration:860,easing:`cubic-bezier(0.62, 0, 0.18, 1)`};w(j).style.width=w(j).style.height=`${r*2}px`,e.style.position=`relative`,e.style.zIndex=`1001`,e.style.background=`var(--bg)`;let a=e.animate([{clipPath:`circle(0px at ${t}px ${n}px)`},{clipPath:`circle(${r}px at ${t}px ${n}px)`}],i);w(j).animate([{scale:0,opacity:1},{scale:.7,opacity:1,offset:.7},{scale:1,opacity:0}],i),document.getElementById(`view`)?.animate([{scale:.88,opacity:0},{opacity:1,offset:.5},{scale:1,opacity:1}],{duration:1020,easing:`cubic-bezier(0.23, 1, 0.32, 1)`});let s=0,c=()=>{L?.hole((a.effect?.getComputedTiming().progress??1)*r),s=requestAnimationFrame(c)};c();let l=()=>{cancelAnimationFrame(s),e.style.position=``,e.style.zIndex=``,e.style.background=``,m.ondone()};a.finished.then(l,l)}function G(e){e.key===`Escape`&&w(A)===`leaving`&&L?.skip(),e.key===`Enter`&&w(A)===`idle`&&e.target!==w(O)&&H()}function re(){w(A)===`leaving`&&L?.skip()}var K=He();s(`keydown`,l,G),s(`pointerdown`,l,re);var q=E(K);let ie;x(q,e=>o(S,e),()=>w(S));var ae=t(q,4);x(ae,e=>o(C,e),()=>w(C));var J=t(ae,2);let Y;var oe=t(E(J),4),se=E(oe),ce=E(se);h(ce,{get name(){return w(I).icon},size:17}),e(se);var le=t(se,2),ue=E(le),de=a(ue,!0),fe=t(ue,2),pe=a(fe,!0);e(le),e(oe),e(J),x(J,e=>o(M,e),()=>w(M));var X=t(J,4),Z=t(E(X),6);x(Z,e=>o(O,e),()=>w(O)),g(2),e(X),x(X,e=>o(k,e),()=>w(k));var me=t(X,2);x(me,e=>o(j,e),()=>w(j)),e(K),D(()=>{u(K,`data-phase`,w(A)),ie=_(q,1,`svelte-1aubhyq`,null,ie,{hit:w(N)>0}),Y=_(J,1,`tip svelte-1aubhyq`,null,Y,{on:w(N)>0}),u(J,`data-corner`,w(F)),d(de,w(I).title),d(pe,w(I).line)}),p(`click`,Z,H),b(f,K),n()}m([`click`]);function We(){return new Promise(e=>{let t=C(Ue,{target:document.body,props:{oncovered:t=>{S(),e(t)},ondone:()=>void f(t)}})})}export{We as runLanding};