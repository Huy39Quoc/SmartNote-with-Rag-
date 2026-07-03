package org.example.velora.util;

import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class RichTextContent {

    private static final Set<String> ALLOWED_TAGS = Set.of(
            "b", "i", "u", "strong", "em", "span", "p", "div", "br",
            "ul", "ol", "li", "h1", "h2", "h3", "blockquote",
            "a", "img", "table", "thead", "tbody", "tr", "th", "td"
    );

    private static final Set<String> ALLOWED_COLORS = Set.of(
            "#e8e6de", "#ffffff", "#f87171", "#fb923c", "#facc15",
            "#4ade80", "#38bdf8", "#a78bfa", "#f472b6"
    );

    private static final Set<String> ALLOWED_TEXT_ALIGN = Set.of(
            "left", "center", "right", "justify"
    );

    private static final Pattern TAG_PATTERN = Pattern.compile("<(/?)([a-zA-Z0-9]+)([^>]*)>");
    private static final Pattern STYLE_ATTR_PATTERN = Pattern.compile("(?i)\\bstyle\\s*=\\s*([\"'])(.*?)\\1");
    private static final Pattern COLOR_ATTR_PATTERN = Pattern.compile("(?i)\\bcolor\\s*=\\s*([\"']?)(#[0-9a-f]{6}|rgb\\(\\s*\\d{1,3}\\s*,\\s*\\d{1,3}\\s*,\\s*\\d{1,3}\\s*\\))\\1");
    private static final Pattern COLOR_STYLE_PATTERN = Pattern.compile(
            "(?i)(?:^|;)\\s*color\\s*:\\s*(#[0-9a-f]{6}|rgb\\(\\s*\\d{1,3}\\s*,\\s*\\d{1,3}\\s*,\\s*\\d{1,3}\\s*\\))\\s*(?:;|$)"
    );
    private static final Pattern TEXT_ALIGN_STYLE_PATTERN = Pattern.compile(
            "(?i)(?:^|;)\\s*text-align\\s*:\\s*(left|center|right|justify)\\s*(?:;|$)"
    );
    private static final Pattern HREF_ATTR_PATTERN = Pattern.compile("(?i)\\bhref\\s*=\\s*([\"'])(.*?)\\1");
    private static final Pattern SRC_ATTR_PATTERN = Pattern.compile("(?i)\\bsrc\\s*=\\s*([\"'])(.*?)\\1");
    private static final Pattern ALT_ATTR_PATTERN = Pattern.compile("(?i)\\balt\\s*=\\s*([\"'])(.*?)\\1");

    private RichTextContent() {
    }

    public static String sanitize(String html) {
        if (html == null || html.isBlank()) return html == null ? null : "";

        String normalizedHtml = decodeBasicEntities(html);

        String withoutDangerousBlocks = normalizedHtml
                .replaceAll("(?is)<script[^>]*>.*?</script>", "")
                .replaceAll("(?is)<style[^>]*>.*?</style>", "")
                .replaceAll("(?is)<!--.*?-->", "");

        Matcher matcher = TAG_PATTERN.matcher(withoutDangerousBlocks);
        StringBuilder clean = new StringBuilder();

        while (matcher.find()) {
            String slash = matcher.group(1);
            String tag = matcher.group(2).toLowerCase();
            String attrs = matcher.group(3);
            String replacement = "";

            if (ALLOWED_TAGS.contains(tag)) {
                if ("/".equals(slash)) {
                    if ("img".equals(tag)) {
                        replacement = "";
                    } else {
                        replacement = "</" + tag + ">";
                    }
                } else if ("br".equals(tag)) {
                    replacement = "<br>";
                } else if ("span".equals(tag)) {
                    String color = extractAllowedColor(attrs);
                    replacement = color == null ? "<span>" : "<span style=\"color: " + color + "\">";
                } else if (allowsTextAlign(tag)) {
                    String textAlign = extractAllowedTextAlign(attrs);
                    replacement = textAlign == null ? "<" + tag + ">" : "<" + tag + " style=\"text-align: " + textAlign + "\">";
                } else if ("a".equals(tag)) {
                    String href = extractSafeHref(attrs);
                    replacement = href == null ? "<a>" : "<a href=\"" + escapeAttribute(href) + "\" target=\"_blank\" rel=\"noopener noreferrer\">";
                } else if ("img".equals(tag)) {
                    String src = extractSafeImageSrc(attrs);
                    if (src != null) {
                        String alt = extractAlt(attrs);
                        replacement = "<img src=\"" + escapeAttribute(src) + "\"" + (alt == null ? "" : " alt=\"" + escapeAttribute(alt) + "\"") + ">";
                    }
                } else {
                    replacement = "<" + tag + ">";
                }
            }

            matcher.appendReplacement(clean, Matcher.quoteReplacement(replacement));
        }

        matcher.appendTail(clean);
        return clean.toString();
    }

    public static String toPlainText(String html) {
        if (html == null || html.isBlank()) return "";

        String readable = sanitize(html)
                .replaceAll("(?i)<br\\s*/?>", "\n")
                .replaceAll("(?i)</(?:p|div|li|h[1-3]|blockquote|tr|table)>", "\n")
                .replaceAll("<[^>]+>", " ");

        return decodeBasicEntities(readable)
                .replace('\u00a0', ' ')
                .replaceAll("[ \\t\\x0B\\f\\r]+", " ")
                .replaceAll("\\n\\s+", "\n")
                .replaceAll("\\n{3,}", "\n\n")
                .trim();
    }

    public static boolean hasText(String html) {
        return !toPlainText(html).isBlank();
    }

    private static String extractAllowedColor(String attrs) {
        if (attrs == null || attrs.isBlank()) return null;

        Matcher styleMatcher = STYLE_ATTR_PATTERN.matcher(attrs);
        if (styleMatcher.find()) {
            Matcher colorMatcher = COLOR_STYLE_PATTERN.matcher(styleMatcher.group(2));

            if (colorMatcher.find()) {
                String color = normalizeColor(colorMatcher.group(1));
                return ALLOWED_COLORS.contains(color) ? color : null;
            }
        }

        Matcher colorAttrMatcher = COLOR_ATTR_PATTERN.matcher(attrs);
        if (colorAttrMatcher.find()) {
            String color = normalizeColor(colorAttrMatcher.group(2));
            return ALLOWED_COLORS.contains(color) ? color : null;
        }

        return null;
    }

    private static String normalizeColor(String color) {
        String normalized = color == null ? "" : color.trim().toLowerCase();
        if (!normalized.startsWith("rgb")) return normalized;

        Matcher matcher = Pattern.compile("\\d{1,3}").matcher(normalized);
        StringBuilder hex = new StringBuilder("#");
        int count = 0;

        while (matcher.find() && count < 3) {
            int channel = Math.max(0, Math.min(255, Integer.parseInt(matcher.group())));
            hex.append(String.format("%02x", channel));
            count++;
        }

        return count == 3 ? hex.toString() : normalized;
    }

    private static boolean allowsTextAlign(String tag) {
        return Set.of("p", "div", "h1", "h2", "h3", "th", "td").contains(tag);
    }

    private static String extractAllowedTextAlign(String attrs) {
        if (attrs == null || attrs.isBlank()) return null;

        Matcher styleMatcher = STYLE_ATTR_PATTERN.matcher(attrs);
        if (!styleMatcher.find()) return null;

        Matcher textAlignMatcher = TEXT_ALIGN_STYLE_PATTERN.matcher(styleMatcher.group(2));
        if (!textAlignMatcher.find()) return null;

        String textAlign = textAlignMatcher.group(1).toLowerCase();
        return ALLOWED_TEXT_ALIGN.contains(textAlign) ? textAlign : null;
    }

    private static String extractSafeHref(String attrs) {
        if (attrs == null || attrs.isBlank()) return null;

        Matcher matcher = HREF_ATTR_PATTERN.matcher(attrs);
        if (!matcher.find()) return null;

        String href = decodeBasicEntities(matcher.group(2)).trim();
        return href.matches("(?i)^(https?:|mailto:|tel:).+") ? href : null;
    }

    private static String extractSafeImageSrc(String attrs) {
        if (attrs == null || attrs.isBlank()) return null;

        Matcher matcher = SRC_ATTR_PATTERN.matcher(attrs);
        if (!matcher.find()) return null;

        String src = decodeBasicEntities(matcher.group(2)).trim();
        return src.matches("(?i)^(https?:|data:image/(?:png|jpe?g|gif|webp);base64,).+") ? src : null;
    }

    private static String extractAlt(String attrs) {
        if (attrs == null || attrs.isBlank()) return null;

        Matcher matcher = ALT_ATTR_PATTERN.matcher(attrs);
        if (!matcher.find()) return null;

        String alt = decodeBasicEntities(matcher.group(2)).trim();
        return alt.isBlank() ? null : alt.substring(0, Math.min(alt.length(), 200));
    }

    private static String escapeAttribute(String value) {
        return value
                .replace("&", "&amp;")
                .replace("\"", "&quot;")
                .replace("<", "&lt;")
                .replace(">", "&gt;");
    }

    private static String decodeBasicEntities(String value) {
        return value
                .replace("&nbsp;", " ")
                .replace("&amp;", "&")
                .replace("&lt;", "<")
                .replace("&gt;", ">")
                .replace("&quot;", "\"")
                .replace("&#39;", "'");
    }
}
