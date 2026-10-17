import {readFile,writeFile} from 'node:fs/promises';
export async function savePreparation(file,plan){
 try{await writeFile(file,JSON.stringify({plan,status:'prepared; no Stripe invoice created'},null,2)+'\n',{flag:'wx',mode:0o600});}
 catch(error){if(error.code!=='EEXIST')throw error;const saved=JSON.parse(await readFile(file,'utf8'));if(saved.plan?.id!==plan.id)throw Error('Existing billing record mismatch.');}
}
