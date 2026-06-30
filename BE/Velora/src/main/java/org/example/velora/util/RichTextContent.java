package org.example.velora.util;

import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class RichTextContent {

    private static final Set<String> ALLOWED_TAGS = Set.of(
            "b", "i", "u", "strong", "em", "span", "p", "div", "br",
            "ul", "ol", "li", "h1", "h2", "h3", "blockquote"
    );

    private static final Set<String> ALLOWED_COLORS = Set.of(
            "#e8e6de", "#ffffff", "#f87171", "#fb923c", "#facc15",
            "#4ade80", "#38bdf8", "#a78bfa", "#f472b6"
    );

    private static final Pattern TAG_PATTERN = Pattern.compile("<(/?)([a-zA-Z0-9]+)([^>]*)>");
    private static final Pattern STYLE_ATTR_PATTERN = Pattern.compile("(?i)\\bstyle\\s*=\\s*([\"'])(.*?)\\1");
    private static final Pattern COLOR_ATTR_PATTERN = Pattern.compile("(?i)\\bcolor\\s*=\\s*([\"']?)(#[0-9a-f]{6}|rgb\\(\\s*\\d{1,3}\\s*,\\s*\\d{1,3}\\s*,\\s*\\d{1,3}\\s*\\))\\1");
    private static final Pattern COLOR_STYLE_PATTERN = Pattern.compile(
            "(?i)(?:^|;)\\s*color\\s*:\\s*(#[0-9a-f]{6}|rgb\\(\\s*\\d{1,3}\\s*,\\s*\\d{1,3}\\s*,\\s*\\d{1,3}\\s*\\))\\s*(?:;|$)"
    );

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
                    replacement = "</" + tag + ">";
                } else if ("br".equals(tag)) {
                    replacement = "<br>";
                } else if ("span".equals(tag)) {
                    String color = extractAllowedColor(attrs);
                    replacement = color == null ? "<span>" : "<span style=\"color: " + color + "\">";
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
                .replaceAll("(?i)</(?:p|div|li|h[1-3]|blockquote)>", "\n")
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
