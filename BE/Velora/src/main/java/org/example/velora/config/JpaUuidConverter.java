package org.example.velora.config;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.util.UUID;

@Converter(autoApply = true)
public class JpaUuidConverter implements AttributeConverter<UUID, String> {

    @Override
    public String convertToDatabaseColumn(UUID attribute) {
        return attribute != null ? attribute.toString() : null;
    }

    @Override
    public UUID convertToEntityAttribute(String dbData) {
        return dbData != null ? UUID.fromString(dbData) : null;
    }
}