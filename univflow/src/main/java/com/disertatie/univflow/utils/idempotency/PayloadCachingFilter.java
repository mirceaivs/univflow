package com.disertatie.univflow.utils.idempotency;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class PayloadCachingFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String contentType = request.getContentType();

        
        if (contentType != null && contentType.toLowerCase().contains("multipart/form-data")) {
            filterChain.doFilter(request, response);
            return;
        }

        
        if (contentType == null && ("POST".equalsIgnoreCase(request.getMethod()) || "PUT".equalsIgnoreCase(request.getMethod()))) {
            filterChain.doFilter(request, response);
            return;
        }

        filterChain.doFilter(new CachedBodyHttpServletRequest(request), response);
    }
}