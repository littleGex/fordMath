async function e(){try{const t=await fetch("/fordMath/test-results.json",{cache:"no-cache"});return t.ok?await t.json():null}catch{return null}}export{e as l};
