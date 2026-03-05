import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const snackBar = inject(MatSnackBar);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let message = 'Ocorreu um erro inesperado.';

      if (error.status === 0) {
        message = 'Sem conexão com o servidor.';
      } else if (error.status === 400) {
        message = error.error?.message || 'Dados inválidos.';
      } else if (error.status === 404) {
        message = 'Recurso não encontrado.';
      } else if (error.status === 500) {
        message = 'Erro interno do servidor.';
      }

      snackBar.open(message, 'Fechar', {
        duration: 5000,
        horizontalPosition: 'end',
        verticalPosition: 'top'
      });

      return throwError(() => error);
    })
  );
};
