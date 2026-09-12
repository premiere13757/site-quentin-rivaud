export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'Méthode non autorisée'});
  if(!process.env.GEMINI_API_KEY)return res.status(500).json({error:'Clé Gemini absente'});
  const {question,courses=[],firstName='Quentin',image=null}=req.body||{};
  if(!question||typeof question!=='string')return res.status(400).json({error:'Question manquante'});
  const courseContext=courses.length?courses.map(c=>`Matière : ${c.matiere}\nRemarques : ${c.notes}\nCours : ${c.cours}`).join('\n\n'):'Aucun cours enregistré pour le moment.';
  const prompt=`Tu es l’assistant scolaire personnel de ${firstName}, élève de lycée. Réponds en français, clairement et sans inventer le contenu de ses cours. Appuie-toi en priorité sur les cours fournis. Si l’information n’y figure pas, précise-le. Aide à comprendre et à réviser, mais ne fais pas passer une supposition pour un fait.\n\nCOURS ENREGISTRÉS :\n${courseContext}\n\nQUESTION :\n${question}`;
  try{
    const parts=[{text:prompt}];
    if(image?.data&&image?.mimeType){if(image.data.length>4000000)return res.status(413).json({error:'Image trop volumineuse'});parts.push({inlineData:{mimeType:image.mimeType,data:image.data}})}
    const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts}],generationConfig:{temperature:image?0.1:0.4,maxOutputTokens:2500}})});
    const data=await response.json();
    if(!response.ok)throw new Error(data?.error?.message||'Erreur Gemini');
    const answer=data?.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('').trim();
    if(!answer)throw new Error('Réponse vide');
    return res.status(200).json({answer});
  }catch(error){
    console.error('Gemini:',error.message);
    return res.status(502).json({error:'Le service IA ne répond pas'});
  }
}
