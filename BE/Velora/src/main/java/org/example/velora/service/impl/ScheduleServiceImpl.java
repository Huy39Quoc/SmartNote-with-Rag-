package org.example.velora.service.impl;

import org.example.velora.dto.request.ScheduleRequest;
import org.example.velora.dto.response.ScheduleResponse;
import org.example.velora.entity.Note;
import org.example.velora.entity.Schedule;
import org.example.velora.entity.User;
import org.example.velora.exception.ResourceNotFoundException;
import org.example.velora.repository.NoteRepository;
import org.example.velora.repository.ScheduleRepository;
import org.example.velora.repository.UserRepository;
import org.example.velora.service.AiService;
import org.example.velora.service.ScheduleService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import org.example.velora.exception.BadRequestException;
@Service @RequiredArgsConstructor @Transactional
public class ScheduleServiceImpl implements ScheduleService {

    private final ScheduleRepository scheduleRepository;
    private final UserRepository userRepository;
    private final NoteRepository noteRepository;
    private final AiService aiService;

    @Override
    public ScheduleResponse.Item create(UUID userId, ScheduleRequest.Create req) {
        validateDeadlineNotPast(req.getDeadline());

        User user = getUser(userId);

        Note note = null;

        if (req.getNoteId() != null) {
            note = noteRepository.findById(req.getNoteId())
                    .orElseThrow(() -> new ResourceNotFoundException("Ghi chú không tồn tại"));

            if (note.getUser() == null || !note.getUser().getId().equals(userId)) {
                throw new ResourceNotFoundException("Ghi chú không tồn tại");
            }
        }

        Schedule s = Schedule.builder()
                .user(user)
                .note(note)
                .taskName(req.getTaskName() != null ? req.getTaskName().trim() : null)
                .description(req.getDescription())
                .deadline(req.getDeadline())
                .priority(req.getPriority() != null ? req.getPriority() : Schedule.Priority.MEDIUM)
                .build();

        return toItem(scheduleRepository.save(s));
    }

    @Override
    public ScheduleResponse.Item update(UUID userId, UUID scheduleId, ScheduleRequest.Update req) {
        Schedule s = getSchedule(userId, scheduleId);

        if (req.getTaskName() != null) {
            String taskName = req.getTaskName().trim();

            if (taskName.isBlank()) {
                throw new BadRequestException("Tên công việc không được để trống");
            }

            s.setTaskName(taskName);
        }

        if (req.getDescription() != null) {
            s.setDescription(req.getDescription());
        }

        if (req.getDeadline() != null) {
            validateDeadlineNotPast(req.getDeadline());
            s.setDeadline(req.getDeadline());
        }

        if (req.getPriority() != null) {
            s.setPriority(req.getPriority());
        }

        if (req.getIsDone() != null) {
            s.setIsDone(req.getIsDone());
        }

        return toItem(scheduleRepository.save(s));
    }

    @Override
    public void delete(UUID userId, UUID scheduleId) {
        scheduleRepository.delete(getSchedule(userId, scheduleId));
    }

    @Override @Transactional(readOnly = true)
    public List<ScheduleResponse.Item> getAll(UUID userId) {
        return scheduleRepository.findByUserIdOrderByDeadlineAsc(userId)
            .stream().map(this::toItem).toList();
    }

    @Override @Transactional(readOnly = true)
    public ScheduleResponse.PriorityList getPrioritized(UUID userId) {
        List<Schedule> all = scheduleRepository.findByUserIdAndIsDoneFalseOrderByDeadlineAsc(userId);
        LocalDate today = LocalDate.now();
        return ScheduleResponse.PriorityList.builder()
            .overdue(filter(all, Schedule.Priority.URGENT, today, true))
            .urgent(filter(all, Schedule.Priority.URGENT, today, false))
            .high(filter(all, Schedule.Priority.HIGH, today, false))
            .medium(filter(all, Schedule.Priority.MEDIUM, today, false))
            .low(filter(all, Schedule.Priority.LOW, today, false)).build();
    }

    @Override
    public ScheduleResponse.ExtractResult extractFromNote(UUID userId, ScheduleRequest.ExtractFromNote req) {
        User user = getUser(userId);

        Note note = req.getNoteId() != null
                ? noteRepository.findById(req.getNoteId()).orElse(null)
                : null;

        ScheduleResponse.ExtractResult result = aiService.extractSchedules(req.getContent());

        if (result.getExtracted() == null || result.getExtracted().isEmpty()) {
            return result;
        }

        List<ScheduleResponse.Item> savedItems = result.getExtracted().stream()
                .filter(item -> item.getTaskName() != null && !item.getTaskName().isBlank())
                .filter(item -> item.getDeadline() != null)
                .filter(item -> !item.getDeadline().isBefore(LocalDate.now()))
                .filter(item -> {
                    if (note == null) return true;

                    return !scheduleRepository.existsByUserIdAndNoteIdAndTaskNameAndDeadline(
                            userId,
                            note.getId(),
                            item.getTaskName(),
                            item.getDeadline()
                    );
                })
                .map(item -> {
                    Schedule s = Schedule.builder()
                            .user(user)
                            .note(note)
                            .taskName(item.getTaskName())
                            .deadline(item.getDeadline())
                            .priority(item.getPriority() != null ? item.getPriority() : Schedule.Priority.MEDIUM)
                            .extractedByAi(true)
                            .build();

                    return toItem(scheduleRepository.save(s));
                })
                .toList();

        return ScheduleResponse.ExtractResult.builder()
                .extracted(savedItems)
                .totalFound(savedItems.size())
                .rawAiResponse(result.getRawAiResponse())
                .build();
    }

    private List<ScheduleResponse.Item> filter(List<Schedule> all, Schedule.Priority priority,
                                                 LocalDate today, boolean overdue) {
        return all.stream().filter(s -> {
            if (overdue) return s.getDeadline() != null && s.getDeadline().isBefore(today);
            return s.getPriority() == priority &&
                   (s.getDeadline() == null || !s.getDeadline().isBefore(today));
        }).map(this::toItem).collect(Collectors.toList());
    }

    private Schedule getSchedule(UUID userId, UUID scheduleId) {
        Schedule s = scheduleRepository.findById(scheduleId)
            .orElseThrow(() -> new ResourceNotFoundException("Task không tồn tại"));
        if (!s.getUser().getId().equals(userId))
            throw new ResourceNotFoundException("Task không tồn tại");
        return s;
    }

    private User getUser(UUID userId) {
        return userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User không tồn tại"));
    }

    private ScheduleResponse.Item toItem(Schedule s) {
        long days = s.getDeadline() != null
            ? ChronoUnit.DAYS.between(LocalDate.now(), s.getDeadline()) : 999;
        return ScheduleResponse.Item.builder()
            .id(s.getId()).taskName(s.getTaskName()).description(s.getDescription())
            .deadline(s.getDeadline()).priority(s.getPriority()).isDone(s.getIsDone())
            .extractedByAi(s.getExtractedByAi())
            .noteId(s.getNote() != null ? s.getNote().getId() : null)
            .noteTitle(s.getNote() != null ? s.getNote().getTitle() : null)
            .daysUntilDeadline(days).createdAt(s.getCreatedAt()).build();
    }

    private void validateDeadlineNotPast(LocalDate deadline) {
        if (deadline != null && deadline.isBefore(LocalDate.now())) {
            throw new BadRequestException("Deadline không được nằm trong quá khứ");
        }
    }

}
