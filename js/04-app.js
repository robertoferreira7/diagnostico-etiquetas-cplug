
/* Reorganiza a interface preservando IDs, listeners e lógica existentes. */
(function(){
 const panels=[...document.querySelectorAll('.panel')];
 const photo=panels.find(p=>p.querySelector('#photoPrint'));
 const diagnosis=panels.find(p=>p.querySelector('#diagnose'));
 const guide=panels.find(p=>p.querySelector('.ok')&&p.querySelector('h2')?.textContent.trim()==='Orientações');
 const preview=document.querySelector('#previewTitle')?.closest('.panel');
 const sample=preview?.querySelector('#sampleName')?.closest('.grid');
 if(!photo||!diagnosis||!preview||!sample)return;
 photo.id='workspacePhoto';diagnosis.id='workspaceDiagnosis';
 photo.querySelector('h2').textContent='Foto da impressão com problema';
 diagnosis.querySelector('h2').textContent='Diagnóstico e ajustes';
 const photoDescription=photo.querySelector('p.subtle');
 if(photoDescription)photoDescription.textContent='Anexe a foto com defeito e, se desejar, o print das configurações do ERP.';
 const ocrButton=photo.querySelector('#readERP');
 if(ocrButton){const wrap=document.createElement('details');wrap.innerHTML='<summary>Leitura do print do ERP (OCR) — opcional</summary>';const btnContainer=ocrButton.closest('.buttons');const help=photo.querySelectorAll('p.subtle')[1];wrap.appendChild(btnContainer);if(help)wrap.appendChild(help);const status=photo.querySelector('#ocrStatus'),review=photo.querySelector('#ocrReview');if(status)wrap.appendChild(status);if(review)wrap.appendChild(review);photo.appendChild(wrap)}
 sample.after(photo);photo.after(diagnosis);
 const diagnosisPrint=diagnosis.querySelector('#printReport');if(diagnosisPrint)diagnosisPrint.textContent='Imprimir relatório / PDF';
 if(guide){guide.id='workspaceGuide';const history=document.querySelector('#history')?.closest('.panel');if(history)history.after(guide);}
 const heading=document.querySelector('#previewTitle');if(heading)heading.textContent='Prévia, foto real e diagnóstico';
})();

