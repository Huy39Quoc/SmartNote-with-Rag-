import client from "./client";

export async function generateNoteDiagram(noteId, diagramType) {
  const res = await client.post(`/notes/${noteId}/diagram`, {
    diagramType,
  });

  return res.data.data;
}
