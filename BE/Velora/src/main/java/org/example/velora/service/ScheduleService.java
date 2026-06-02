package org.example.velora.service;

import org.example.velora.dto.request.ScheduleRequest;
import org.example.velora.dto.response.ScheduleResponse;
import java.util.List;
import java.util.UUID;

public interface ScheduleService {
    ScheduleResponse.Item create(UUID userId, ScheduleRequest.Create req);
    ScheduleResponse.Item update(UUID userId, UUID scheduleId, ScheduleRequest.Update req);
    void delete(UUID userId, UUID scheduleId);
    List<ScheduleResponse.Item> getAll(UUID userId);
    ScheduleResponse.PriorityList getPrioritized(UUID userId);
    ScheduleResponse.ExtractResult extractFromNote(UUID userId, ScheduleRequest.ExtractFromNote req);

}
