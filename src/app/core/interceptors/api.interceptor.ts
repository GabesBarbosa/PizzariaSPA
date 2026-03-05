import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  if (!environment.production && req.url.startsWith('/api')) {
    const apiReq = req.clone({
      url: `${environment.apiUrl}${req.url.substring(4)}`
    });
    return next(apiReq);
  }
  return next(req);
};
