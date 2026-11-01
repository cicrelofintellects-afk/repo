let timer = null;
let remaining = 0;
let mode = 'work';
let work = 1500;
let rest = 300;
const MAX_SECONDS = 999 * 60;

function clampSeconds(value, fallback = 0){
  const numeric = Number(value);
  const safe = Number.isFinite(numeric) ? numeric : fallback;
  return Math.max(0, Math.min(MAX_SECONDS, Math.floor(safe)));
}

function stopTimer(){ if (timer) clearInterval(timer); timer=null; }
function tick(){
  if (remaining <= 1) {
    remaining = 0;
    postMessage({type:'tick', remaining, mode});
    stopTimer();
    postMessage({type:'done', mode});
    return;
  }
  remaining = clampSeconds(remaining - 1, 0);
  postMessage({type:'tick', remaining, mode});
}

onmessage = (e)=>{
  const {type} = e.data;
  if (type==='start') {
    work = clampSeconds(e.data.work, work);
    rest = clampSeconds(e.data.break, rest);
    mode = e.data.mode || mode; // use the incoming mode before computing remaining
    remaining = clampSeconds(e.data.remaining, (mode==='work'?work:rest));
    stopTimer();
    postMessage({type:'tick', remaining, mode});
    if (remaining <= 0) {
      postMessage({type:'done', mode});
      return;
    }
    timer = setInterval(tick, 1000);
  }
  if (type==='pause') { stopTimer(); }
  if (type==='reset') {
    work = clampSeconds(e.data.work, work);
    rest = clampSeconds(e.data.break, rest);
    stopTimer();
    remaining = work;
    mode='work';
    postMessage({type:'tick', remaining, mode});
  }
};
