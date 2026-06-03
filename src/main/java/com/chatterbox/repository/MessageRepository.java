package com.chatterbox.repository;

import com.chatterbox.model.Message;
import com.chatterbox.model.enums.MessageStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {

    Page<Message> findByChatRoomIdOrderByCreatedAtDesc(Long chatRoomId, Pageable pageable);

    List<Message> findByChatRoomIdOrderByCreatedAtAsc(Long chatRoomId);

    @Query("SELECT COUNT(m) FROM Message m WHERE m.chatRoom.id = :roomId AND m.sender.id != :userId AND m.status != 'READ'")
    long countUnreadMessages(@Param("roomId") Long roomId, @Param("userId") Long userId);

    @Modifying
    @Query("UPDATE Message m SET m.status = :status WHERE m.chatRoom.id = :roomId AND m.sender.id != :userId AND m.status != 'READ'")
    void markMessagesAsRead(@Param("roomId") Long roomId, @Param("userId") Long userId, @Param("status") MessageStatus status);

    Message findTop1ByChatRoomIdOrderByCreatedAtDesc(Long chatRoomId);
}
