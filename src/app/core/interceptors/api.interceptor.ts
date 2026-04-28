import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);
  const isPublic = req.url.includes('/api/public/');
  const token = isPlatformBrowser(platformId) ? localStorage.getItem('token') : null;

  if (token && !isPublic) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(req).pipe(
    catchError(err => {
      if (err.status === 401 && !isPublic && !req.url.includes('/api/auth/')) {
        if (isPlatformBrowser(platformId)) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
        router.navigate(['/login']);
      }
      return throwError(() => err);
    })
  );
};
