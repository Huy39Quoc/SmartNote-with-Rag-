package org.example.velora.service.impl;

import lombok.RequiredArgsConstructor;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.apache.poi.xwpf.usermodel.*;
import org.example.velora.entity.Note;
import org.example.velora.entity.User;
import org.example.velora.exception.BadRequestException;
import org.example.velora.exception.ResourceNotFoundException;
import org.example.velora.repository.NoteRepository;
import org.example.velora.repository.UserRepository;
import org.example.velora.service.NoteExportService;
import org.example.velora.service.PackageValidationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NoteExportServiceImpl implements NoteExportService {

    private final NoteRepository noteRepository;
    private final UserRepository userRepository;
    private final PackageValidationService packageValidationService;

    @Override
    public ExportedFile export(UUID userId, UUID noteId, String format) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User không tồn tại"));

        packageValidationService.validateFeatureAccess(user, "EXPORT_FILE");

        Note note = noteRepository.findById(noteId)
                .orElseThrow(() -> new ResourceNotFoundException("Ghi chú không tồn tại"));

        if (note.getUser() == null || !note.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("Ghi chú không tồn tại");
        }

        String normalizedFormat = format == null ? "" : format.trim().toLowerCase();

        return switch (normalizedFormat) {
            case "pdf" -> buildPdf(note);
            case "docx", "word" -> buildDocx(note);
            default -> throw new BadRequestException("Định dạng export không hợp lệ");
        };
    }

    private ExportedFile buildDocx(Note note) {
        try (
                XWPFDocument document = new XWPFDocument();
                ByteArrayOutputStream out = new ByteArrayOutputStream()
        ) {
            XWPFParagraph titleParagraph = document.createParagraph();
            titleParagraph.setAlignment(ParagraphAlignment.LEFT);

            XWPFRun titleRun = titleParagraph.createRun();
            titleRun.setBold(true);
            titleRun.setFontSize(18);
            titleRun.setFontFamily("Arial");
            titleRun.setText(safeText(note.getTitle()));

            XWPFParagraph metaParagraph = document.createParagraph();
            XWPFRun metaRun = metaParagraph.createRun();
            metaRun.setFontSize(10);
            metaRun.setFontFamily("Arial");
            metaRun.setColor("666666");
            metaRun.setText(buildMetaText(note));

            document.createParagraph();

            String content = safeText(note.getContent());

            if (content.isBlank()) {
                XWPFParagraph p = document.createParagraph();
                XWPFRun r = p.createRun();
                r.setFontFamily("Arial");
                r.setFontSize(12);
                r.setText("(Ghi chú chưa có nội dung)");
            } else {
                for (String line : content.split("\\R", -1)) {
                    XWPFParagraph p = document.createParagraph();
                    XWPFRun r = p.createRun();
                    r.setFontFamily("Arial");
                    r.setFontSize(12);
                    r.setText(line);
                }
            }

            document.write(out);

            return ExportedFile.builder()
                    .fileName(buildFileName(note, "docx"))
                    .contentType("application/vnd.openxmlformats-officedocument.wordprocessingml.document")
                    .bytes(out.toByteArray())
                    .build();
        } catch (Exception e) {
            throw new RuntimeException("Không thể export Word", e);
        }
    }

    private ExportedFile buildPdf(Note note) {
        try (
                PDDocument document = new PDDocument();
                ByteArrayOutputStream out = new ByteArrayOutputStream()
        ) {
            PDType0Font font = loadUnicodeFont(document);

            float margin = 50;
            float fontSize = 12;
            float titleSize = 18;
            float lineHeight = 17;
            float pageWidth = PDRectangle.A4.getWidth();
            float pageHeight = PDRectangle.A4.getHeight();
            float maxWidth = pageWidth - margin * 2;

            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);

            PDPageContentStream stream = new PDPageContentStream(document, page);
            stream.beginText();

            float y = pageHeight - margin;

            stream.setFont(font, titleSize);
            stream.newLineAtOffset(margin, y);

            for (String line : wrapLine(safeText(note.getTitle()), font, titleSize, maxWidth)) {
                stream.showText(cleanPdfLine(line));
                stream.newLineAtOffset(0, -22);
                y -= 22;
            }

            stream.setFont(font, 10);
            stream.showText(cleanPdfLine(buildMetaText(note)));
            stream.newLineAtOffset(0, -24);
            y -= 24;

            stream.setFont(font, fontSize);

            String content = safeText(note.getContent());

            if (content.isBlank()) {
                content = "(Ghi chú chưa có nội dung)";
            }

            for (String rawLine : content.split("\\R", -1)) {
                List<String> wrappedLines = rawLine.isBlank()
                        ? List.of("")
                        : wrapLine(rawLine, font, fontSize, maxWidth);

                for (String line : wrappedLines) {
                    if (y < margin + lineHeight) {
                        stream.endText();
                        stream.close();

                        page = new PDPage(PDRectangle.A4);
                        document.addPage(page);

                        stream = new PDPageContentStream(document, page);
                        stream.beginText();
                        stream.setFont(font, fontSize);

                        y = pageHeight - margin;
                        stream.newLineAtOffset(margin, y);
                    }

                    stream.showText(cleanPdfLine(line));
                    stream.newLineAtOffset(0, -lineHeight);
                    y -= lineHeight;
                }
            }

            stream.endText();
            stream.close();

            document.save(out);

            return ExportedFile.builder()
                    .fileName(buildFileName(note, "pdf"))
                    .contentType("application/pdf")
                    .bytes(out.toByteArray())
                    .build();
        } catch (Exception e) {
            throw new RuntimeException("Không thể export PDF", e);
        }
    }

    private PDType0Font loadUnicodeFont(PDDocument document) throws IOException {
        List<String> fontPaths = List.of(
                "C:/Windows/Fonts/arial.ttf",
                "C:/Windows/Fonts/Arial.ttf",
                "C:/Windows/Fonts/calibri.ttf",
                "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
                "/System/Library/Fonts/Supplemental/Arial.ttf"
        );

        for (String path : fontPaths) {
            File file = new File(path);

            if (file.exists()) {
                return PDType0Font.load(document, file);
            }
        }

        throw new IOException("Không tìm thấy font Unicode để export PDF tiếng Việt");
    }

    private List<String> wrapLine(
            String text,
            PDType0Font font,
            float fontSize,
            float maxWidth
    ) throws IOException {
        List<String> lines = new ArrayList<>();

        if (text == null || text.isBlank()) {
            lines.add("");
            return lines;
        }

        String[] words = text.trim().split("\\s+");
        StringBuilder currentLine = new StringBuilder();

        for (String word : words) {
            String candidate = currentLine.isEmpty()
                    ? word
                    : currentLine + " " + word;

            float candidateWidth = font.getStringWidth(candidate) / 1000 * fontSize;

            if (candidateWidth <= maxWidth) {
                currentLine = new StringBuilder(candidate);
            } else {
                if (!currentLine.isEmpty()) {
                    lines.add(currentLine.toString());
                }

                float wordWidth = font.getStringWidth(word) / 1000 * fontSize;

                if (wordWidth > maxWidth) {
                    lines.addAll(splitLongWord(word, font, fontSize, maxWidth));
                    currentLine = new StringBuilder();
                } else {
                    currentLine = new StringBuilder(word);
                }
            }
        }

        if (!currentLine.isEmpty()) {
            lines.add(currentLine.toString());
        }

        return lines;
    }

    private List<String> splitLongWord(
            String word,
            PDType0Font font,
            float fontSize,
            float maxWidth
    ) throws IOException {
        List<String> result = new ArrayList<>();
        StringBuilder current = new StringBuilder();

        for (char c : word.toCharArray()) {
            String candidate = current.toString() + c;
            float width = font.getStringWidth(candidate) / 1000 * fontSize;

            if (width <= maxWidth) {
                current.append(c);
            } else {
                if (!current.isEmpty()) {
                    result.add(current.toString());
                }

                current = new StringBuilder(String.valueOf(c));
            }
        }

        if (!current.isEmpty()) {
            result.add(current.toString());
        }

        return result;
    }

    private String safeText(String value) {
        return value == null ? "" : value;
    }

    private String cleanPdfLine(String value) {
        if (value == null) return "";

        return value
                .replace("\r", " ")
                .replace("\n", " ")
                .replace("\t", " ");
    }

    private String buildMetaText(Note note) {
        if (note.getUpdatedAt() == null) {
            return "Export từ Velora SmartNote AI";
        }

        return "Cập nhật lần cuối: " +
                note.getUpdatedAt().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
    }

    private String buildFileName(Note note, String extension) {
        String title = safeText(note.getTitle()).trim();

        if (title.isBlank()) {
            title = "ghi-chu";
        }

        String safeTitle = title
                .replaceAll("[\\\\/:*?\"<>|]", "")
                .replaceAll("\\s+", "-");

        if (safeTitle.length() > 60) {
            safeTitle = safeTitle.substring(0, 60);
        }

        return safeTitle + "." + extension;
    }
}