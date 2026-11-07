const n="fm.lang";function a(t="de"){try{const e=localStorage.getItem(n);return e==="de"||e==="en"?e:t}catch{return t}}function c(t){try{localStorage.setItem(n,t)}catch{}}export{a as g,c as s};
