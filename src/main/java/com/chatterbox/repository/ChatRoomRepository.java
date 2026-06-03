package com.chatterbox.repository;

import com.chatterbox.model.ChatRoom;
import com.chatterbox.model.enums.ChatRoomType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatRoomRepository extends JpaRepository<ChatRoom, Long> {

    @Query("SELECT cr FROM ChatRoom cr JOIN cr.participants p WHERE p.user.id = :userId ORDER BY cr.createdAt DESC")
    List<ChatRoom> findAllByUserId(@Param("userId") Long userId);

    @Query("SELECT cr FROM ChatRoom cr JOIN cr.participants p1 JOIN cr.participants p2 " +
           "WHERE cr.type = :type AND p1.user.id = :userId1 AND p2.user.id = :userId2")
    Optional<ChatRoom> findDirectChatBetween(@Param("userId1") Long userId1,
                                              @Param("userId2") Long userId2,
                                              @Param("type") ChatRoomType type);
}
