package org.example.velora.util;

import org.apache.pdfbox.Loader;
import org.example.velora.entity.Document;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.stereotype.Component;

import java.io.FileInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;

@Component @Slf4j
public class FileExtractor {

    public String extract(String filePath, Document.FileType type) throws IOException {
        return switch (type) {
            case PDF   -> extractPdf(filePath);
            case DOCX  -> extractDocx(filePath);
            case TXT   -> Files.readString(Paths.get(filePath), StandardCharsets.UTF_8);

            case AUDIO -> throw new UnsupportedOperationException("Audio dùng Whisper, không extract trực tiếp");
        };
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
            doc.getParagraphs().forEach(p -> {
                String text = p.getText();
                if (text != null && !text.isBlank()) sb.append(text).append("\n");
            });
            return sb.toString();
        }
    }
}
