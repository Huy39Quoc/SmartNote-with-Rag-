package org.example.velora.mapper;

import org.example.velora.dto.response.NoteResponse;
import org.example.velora.dto.response.TagResponse;
import org.example.velora.entity.Note;
import org.example.velora.entity.Tag;
import org.example.velora.util.RichTextContent;
import org.springframework.stereotype.Component;
import java.util.List;

@Component
public class NoteMapper {
    public NoteResponse.Summary toSummary(Note note) {
        String plainContent = RichTextContent.toPlainText(note.getContent());
        String preview = plainContent.length() > 120
            ? plainContent.substring(0, 120) + "..." : plainContent;
        return NoteResponse.Summary.builder()
            .id(note.getId()).title(note.getTitle()).contentPreview(preview)
            .isBookmarked(note.getIsBookmarked()).tags(toSimpleTags(note.getTags()))
            .createdAt(note.getCreatedAt()).updatedAt(note.getUpdatedAt()).build();
    }

    public NoteResponse.Detail toDetail(Note note) {
        return NoteResponse.Detail.builder()
            .id(note.getId()).title(note.getTitle()).content(RichTextContent.sanitize(note.getContent()))
            .isBookmarked(note.getIsBookmarked()).isEmbedded(note.getIsEmbedded())
            .tags(toSimpleTags(note.getTags()))
            .createdAt(note.getCreatedAt()).updatedAt(note.getUpdatedAt()).build();
    }

    private List<TagResponse.Simple> toSimpleTags(List<Tag> tags) {
        if (tags == null) return List.of();
        return tags.stream().map(t -> TagResponse.Simple.builder()
            .id(t.getId()).name(t.getName()).color(t.getColor()).build()).toList();
    }
}
