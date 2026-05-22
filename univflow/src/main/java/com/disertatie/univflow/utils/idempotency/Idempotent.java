package com.disertatie.univflow.utils.idempotency;

import java.lang.annotation.*;

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface Idempotent {
    long seconds() default 60;
}