package org.example.velora.security;

import org.example.velora.entity.User;
import org.example.velora.repository.UserRepository;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.context.annotation.Primary;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Service
@Primary
@RequiredArgsConstructor
public class UserDetailsImpl implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetailsWithId loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));
        return new UserDetailsWithId(user);
    }

    public static class UserDetailsWithId implements UserDetails {
        @Getter private final UUID userId;
        private final String email;
        private final String password;
        private final boolean active;
        private final List<SimpleGrantedAuthority> authorities;

        public UserDetailsWithId(User user) {
            this.userId = user.getId();
            this.email = user.getEmail();
            this.password = user.getPasswordHash();
            this.active = user.getIsActive();
            this.authorities = List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));
        }

        @Override public Collection<SimpleGrantedAuthority> getAuthorities() { return authorities; }
        @Override public String getPassword() { return password; }
        @Override public String getUsername() { return email; }
        @Override public boolean isAccountNonLocked() { return active; }
        @Override public boolean isEnabled() { return active; }

        @Override
        public boolean isAccountNonExpired() {
            return true;
        }

        @Override
        public boolean isCredentialsNonExpired() {
            return true;
        }
    }
}
