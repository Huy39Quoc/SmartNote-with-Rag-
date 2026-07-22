package org.example.velora.util;

import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.usermodel.*;
import org.example.velora.entity.Document;
import org.springframework.stereotype.Component;

import java.io.FileInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;

@Component
@Slf4j
public class FileExtractor {

    public String extract(String filePath, Document.FileType type) throws IOException {
        String text = switch (type) {
            case PDF -> extractPdf(filePath);
            case DOCX -> extractDocx(filePath);
            case TXT -> Files.readString(Paths.get(filePath), StandardCharsets.UTF_8);
            case AUDIO -> throw new UnsupportedOperationException("Audio dùng Whisper, không extract trực tiếp");
        };

        return normalizeExtractedText(text);
    }

    private String extractPdf(String path) throws IOException {
        try (PDDocument doc = Loader.loadPDF(new java.io.File(path))) {
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setLineSeparator("\n");
            return stripper.getText(doc);
        }
    }

    private String extractDocx(String path) throws IOException {
        try (XWPFDocument doc = new XWPFDocument(new FileInputStream(path))) {
            StringBuilder sb = new StringBuilder();

            for (XWPFParagraph paragraph : doc.getParagraphs()) {
                appendText(sb, paragraph.getText());
            }

            for (XWPFTable table : doc.getTables()) {
                extractTable(table, sb);
            }

            for (XWPFHeader header : doc.getHeaderList()) {
                for (XWPFParagraph paragraph : header.getParagraphs()) {
                    appendText(sb, paragraph.getText());
                }

                for (XWPFTable table : header.getTables()) {
                    extractTable(table, sb);
                }
            }

            for (XWPFFooter footer : doc.getFooterList()) {
                for (XWPFParagraph paragraph : footer.getParagraphs()) {
                    appendText(sb, paragraph.getText());
                }

                for (XWPFTable table : footer.getTables()) {
                    extractTable(table, sb);
                }
            }

            return sb.toString();
        }
    }

    private void extractTable(XWPFTable table, StringBuilder sb) {
        if (table == null) {
            return;
        }

        for (XWPFTableRow row : table.getRows()) {
            for (XWPFTableCell cell : row.getTableCells()) {
                for (XWPFParagraph paragraph : cell.getParagraphs()) {
                    appendText(sb, paragraph.getText());
                }

                for (XWPFTable nestedTable : cell.getTables()) {
                    extractTable(nestedTable, sb);
                }
            }
        }
    }

    private void appendText(StringBuilder sb, String text) {
        if (text != null && !text.isBlank()) {
            sb.append(text.trim()).append("\n");
        }
    }

    private String normalizeExtractedText(String text) {
        if (text == null) {
            return "";
        }

        return text
                .replace('\u00A0', ' ')
                .replaceAll("[ \\t\\x0B\\f\\r]+", " ")
                .replaceAll("\\n\\s+", "\\n")
                .replaceAll("\\n{3,}", "\\n\\n")
                .trim();
    }
}