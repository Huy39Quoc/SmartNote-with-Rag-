package org.example.velora.util;

import org.springframework.stereotype.Component;
import java.util.List;

@Component
public class PromptBuilder {

    public String buildRagPrompt(String systemPrompt, String question, List<String> chunks) {
        String context = chunks.isEmpty() ? "Không có ngữ cảnh."
            : String.join("\n---\n", chunks);
        return systemPrompt + "\n\nNgữ cảnh từ ghi chú/tài liệu:\n" + context
            + "\n\nCâu hỏi: " + question;
    }

    public String truncate(String text, int maxChars) {
        if (text == null) return "";
        return text.length() > maxChars ? text.substring(0, maxChars) + "..." : text;
    }
}
