package org.example.velora.service;

import org.example.velora.dto.request.NoteRequest;
import org.example.velora.dto.response.DocumentResponse;
import org.example.velora.dto.response.KnowledgeGroupResponse;
import org.example.velora.dto.response.NoteResponse;
import org.example.velora.dto.response.ScheduleResponse;
import org.example.velora.entity.Flashcard;
import org.example.velora.entity.Note;
import org.example.velora.dto.request.NoteRequest;
import java.util.List;

public interface AiService {

    NoteResponse.AiResult improveNote(String content, String title, NoteRequest.AiImprove.AiAction action);

    DocumentResponse.AnalysisResult analyzeDocument(String text, String instruction);

    String chatWithContext(String question, List<String> contextChunks);

    ScheduleResponse.ExtractResult extractSchedules(String content);

    KnowledgeGroupResponse.ClassifyResult classifyContent(String content);

    /**
     * Gọi LM Studio để transcribe file âm thanh → text tiếng Việt
     */
    String transcribeAudioFile(String filePath);

    /**
     * Chuyển transcript thô → ghi chú có cấu trúc markdown
     */
    String structureTranscript(String rawTranscript, String topic);

    /**
     * Đề xuất tiêu đề từ nội dung
     */
    String suggestTitle(String content);

    String getPrompt(String promptKey);

    List<Flashcard> generateFlashcardsFromNote(Note note);

    String generateDiagramFromNote(
            String title,
            String content,
            NoteRequest.GenerateDiagram.DiagramType diagramType
    );
}
