const supabase1 = supabase.createClient(
  'https://heltbjqwskckqifznlml.supabase.co',
  'sb_publishable_vEHhXtkpJq8ndMFvXGK0zg_ok4i8Kqn'
);

const container =document.getElementById('novice');

console.log("JS deluje!");


async function loadNovice() {
  const { data, error } = await supabase1
    .from('novice')
    .select('*')
    .order('created_at', { ascending: false });

    console.log("Nalaganje novic...");
    console.log(data);


  if (error) {
    console.error('Napaka pri pridobivanju novic:', error);
    return;
  }

  container.innerHTML = data.map(novica => `
    <article>
      <p><strong>Datum:</strong> ${new Date(novica.created_at).toLocaleDateString()}</p>
      <h2>${novica.title}</h2>
      ${novica.image_url ? `<img src="${novica.image_url}" alt="Slika novice" />` : ''}
      <p>${novica.content}</p>
    </article>
  `).join('');
}

loadNovice();

