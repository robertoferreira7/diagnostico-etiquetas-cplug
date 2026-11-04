
(function(){
const diag=document.getElementById('workspaceDiagnosis');const tool=document.querySelector('.mode-simple')?.parentElement;
if(diag&&tool){const out=document.getElementById('v5alerts');if(out)out.after(diag);}
const photo=document.getElementById('workspacePhoto');const slot=document.getElementById('v15photoSlot');if(photo&&slot)slot.appendChild(photo);
const mode=document.getElementById('v5mode');if(mode){mode.addEventListener('change',()=>{const p=document.getElementById('workspacePhoto'),s=document.getElementById('v15photoSlot');if(p&&s)s.appendChild(p);});}
})();

