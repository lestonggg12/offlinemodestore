from django.contrib.auth import login

COOKIE_NAME    = 'remember_me'
COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 10   # 10 years


class PersistentLoginMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not request.user.is_authenticated:
            self._try_auto_login(request)

        response = self.get_response(request)

        if request.user.is_authenticated and COOKIE_NAME in request.COOKIES:
            host   = request.get_host().split(':')[0]
            secure = host not in ('localhost', '127.0.0.1', '::1')
            response.set_cookie(
                COOKIE_NAME,
                request.COOKIES[COOKIE_NAME],
                max_age=COOKIE_MAX_AGE,
                httponly=True,
                samesite='Lax',
                secure=secure,
            )

        return response

    def _try_auto_login(self, request):
        token_value = request.COOKIES.get(COOKIE_NAME)
        if not token_value:
            return
        try:
            from .models import RememberMeToken
            token_obj = RememberMeToken.objects.select_related('user').get(token=token_value)
            user = token_obj.user
            user.backend = 'django.contrib.auth.backends.ModelBackend'
            login(request, user)
            token_obj.save(update_fields=['last_used'])
        except Exception:
            pass
