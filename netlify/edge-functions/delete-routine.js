// delete-routine.js
// Yukarıdaki schedule-routine.js’de kullanılan global nesne örneğini aynı şekilde kullanıyoruz.
let scheduledRoutines = {};

export default async (request, context) => {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }
  try {
    const { id } = await request.json();
    if (scheduledRoutines[id]) {
      delete scheduledRoutines[id];
      console.log(`Rutin bildirimi iptal edildi: ${id}`);
    }
    return new Response(
      JSON.stringify({ message: "Rutin bildirimi iptal edildi." }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Delete Routine Hatası:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
