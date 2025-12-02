import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useAuth } from '../../context/AuthContext';
import styles from './AuthModal.module.css';
import { GoogleLogin } from '@react-oauth/google';
import ReCAPTCHA from 'react-google-recaptcha';

const View = {
  LOGIN: 'login',
  REGISTER: 'register',
  FORGOT: 'forgot',
  VERIFY: 'verifyEmail'
};

const ForgotStep = {
  REQUEST: 'request',
  VERIFY: 'verify'
};

const initialLoginForm = {
  email: '',
  password: ''
};

const initialRegisterForm = {
  name: '',
  email: '',
  password: '',
  confirmPassword: ''
};

const initialForgotForm = {
  email: '',
  code: '',
  newPassword: '',
  confirmPassword: ''
};

const recaptchaSiteKey = process.env.REACT_APP_RECAPTCHA_SITE_KEY || '';
const recaptchaEnabled = Boolean(recaptchaSiteKey);

const formatSeconds = (totalSeconds) => {
  const safeSeconds = Math.max(0, Number.isFinite(totalSeconds) ? totalSeconds : 0);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const AuthModal = ({ open, onClose }) => {
  const {
    login,
    register,
    requestPasswordReset,
    confirmPasswordReset,
    verifyEmail,
    resendVerification,
    loginWithGoogleCredential
  } = useAuth();
  const googleEnabled = Boolean(process.env.REACT_APP_GOOGLE_CLIENT_ID);
  const [activeView, setActiveView] = useState(View.LOGIN);
  const [loginForm, setLoginForm] = useState(initialLoginForm);
  const [registerForm, setRegisterForm] = useState(initialRegisterForm);
  const [forgotForm, setForgotForm] = useState(initialForgotForm);
  const [forgotStep, setForgotStep] = useState(ForgotStep.REQUEST);
  const [verificationForm, setVerificationForm] = useState({ email: '', code: '' });
  const [loginPasswordVisible, setLoginPasswordVisible] = useState(false);
  const [registerPasswordVisible, setRegisterPasswordVisible] = useState(false);
  const [registerConfirmVisible, setRegisterConfirmVisible] = useState(false);
  const [forgotNewPasswordVisible, setForgotNewPasswordVisible] = useState(false);
  const [forgotConfirmPasswordVisible, setForgotConfirmPasswordVisible] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resendAvailableAt, setResendAvailableAt] = useState(null);
  const [resendSecondsLeft, setResendSecondsLeft] = useState(0);
  const [registerCaptchaToken, setRegisterCaptchaToken] = useState('');
  const [forgotCaptchaToken, setForgotCaptchaToken] = useState('');
  const registerRecaptchaRef = useRef(null);
  const forgotRecaptchaRef = useRef(null);
  const pointerDownOnBackdrop = useRef(false);

  useEffect(() => {
    if (!open) {
      setActiveView(View.LOGIN);
      setLoginForm(initialLoginForm);
      setRegisterForm(initialRegisterForm);
      setForgotForm(initialForgotForm);
      setForgotStep(ForgotStep.REQUEST);
      setVerificationForm({ email: '', code: '' });
      setError('');
      setInfo('');
      setSubmitting(false);
      setResendAvailableAt(null);
      setResendSecondsLeft(0);
      setRegisterCaptchaToken('');
      setForgotCaptchaToken('');
      if (registerRecaptchaRef.current) {
        registerRecaptchaRef.current.reset();
      }
      if (forgotRecaptchaRef.current) {
        forgotRecaptchaRef.current.reset();
      }
    }
  }, [open]);

  const handleBackdropMouseDown = (event) => {
    pointerDownOnBackdrop.current = event.target === event.currentTarget;
  };

  const handleBackdropMouseUp = (event) => {
    if (pointerDownOnBackdrop.current && event.target === event.currentTarget) {
      onClose?.();
    }
    pointerDownOnBackdrop.current = false;
  };

  const handleBackdropMouseLeave = () => {
    pointerDownOnBackdrop.current = false;
  };

  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Escape') {
      onClose?.();
    }
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, handleKeyDown]);

  const handleInputChange = (formSetter) => (event) => {
    const { name, value } = event.target;
    formSetter((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    if (!resendAvailableAt) {
      setResendSecondsLeft(0);
      return undefined;
    }

    const updateCountdown = () => {
      const remaining = Math.max(0, Math.ceil((resendAvailableAt - Date.now()) / 1000));
      setResendSecondsLeft(remaining);
      if (remaining <= 0) {
        setResendAvailableAt(null);
      }
    };

    updateCountdown();
    const intervalId = setInterval(updateCountdown, 1000);
    return () => clearInterval(intervalId);
  }, [resendAvailableAt]);

  const runWithFeedback = async (fn, { closeOnSuccess = true } = {}) => {
    setSubmitting(true);
    setError('');
    setInfo('');

    try {
      const result = await fn();
      if (closeOnSuccess) {
        onClose?.();
      }
      return result;
    } catch (err) {
      console.error(err);
      setError(err.message || 'Não foi possível concluir a operação.');
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const resetRecaptchas = () => {
    setRegisterCaptchaToken('');
    setForgotCaptchaToken('');
    if (registerRecaptchaRef.current) {
      registerRecaptchaRef.current.reset();
    }
    if (forgotRecaptchaRef.current) {
      forgotRecaptchaRef.current.reset();
    }
  };

  const resetInteraction = () => {
    setError('');
    setInfo('');
    setSubmitting(false);
    resetRecaptchas();
  };

  const goToView = (view) => {
    resetInteraction();
    setLoginPasswordVisible(false);
    setRegisterPasswordVisible(false);
    setRegisterConfirmVisible(false);
    setForgotNewPasswordVisible(false);
    setForgotConfirmPasswordVisible(false);

    if (view === View.FORGOT) {
      setForgotForm((prev) => ({
        ...initialForgotForm,
        email: (loginForm.email || registerForm.email || prev.email || '').trim()
      }));
      setForgotStep(ForgotStep.REQUEST);
      setVerificationForm({ email: '', code: '' });
  setLoginPasswordVisible(false);
  setRegisterPasswordVisible(false);
  setRegisterConfirmVisible(false);
  setForgotNewPasswordVisible(false);
  setForgotConfirmPasswordVisible(false);
    } else if (view === View.VERIFY) {
      setVerificationForm((prev) => ({
        email: (registerForm.email || loginForm.email || prev.email || '').trim(),
        code: ''
      }));
    } else {
      setForgotForm(initialForgotForm);
      setForgotStep(ForgotStep.REQUEST);
      setVerificationForm({ email: '', code: '' });
    }

    setActiveView(view);
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    await runWithFeedback(() => login({ ...loginForm }));
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    if (recaptchaEnabled && !registerCaptchaToken) {
      setError('Confirme que você não é um robô para continuar.');
      return;
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      setError('As senhas informadas não conferem.');
      return;
    }

    try {
      const data = await runWithFeedback(
        () => register({ ...registerForm, captchaToken: registerCaptchaToken }),
        { closeOnSuccess: false }
      );

      if (data?.verificationRequired) {
        const sanitizedEmail = (data.email || registerForm.email || '').trim();
        setVerificationForm({ email: sanitizedEmail, code: '' });
        setInfo(data.message || 'Enviamos um código de confirmação para o seu e-mail.');
        setActiveView(View.VERIFY);
      } else {
        onClose?.();
      }
    } catch (err) {
      // runWithFeedback already trata a mensagem de erro
    } finally {
      setRegisterCaptchaToken('');
      if (registerRecaptchaRef.current) {
        registerRecaptchaRef.current.reset();
      }
    }
  };

  const title = useMemo(() => {
    switch (activeView) {
      case View.REGISTER:
        return 'Criar conta';
      case View.FORGOT:
        return 'Redefinir senha';
      case View.VERIFY:
        return 'Confirmar e-mail';
      case View.LOGIN:
      default:
        return 'Entrar';
    }
  }, [activeView]);

  const headerDescription = useMemo(() => {
    switch (activeView) {
      case View.REGISTER:
        return 'Crie sua conta Reflora para acompanhar pedidos e aproveitar novidades.';
      case View.FORGOT:
        return 'Enviaremos um código seguro para que você defina uma nova senha.';
      case View.VERIFY:
        return 'Confirme o endereço de e-mail para concluir seu cadastro com segurança.';
      case View.LOGIN:
      default:
        return 'Entre com seus dados para continuar comprando com toda a segurança.';
    }
  }, [activeView]);

  const showPrimaryTabs = activeView === View.LOGIN || activeView === View.REGISTER;

  const handleForgotBack = () => {
    setForgotNewPasswordVisible(false);
    setForgotConfirmPasswordVisible(false);
    setForgotStep(ForgotStep.REQUEST);
    setForgotCaptchaToken('');
    if (forgotRecaptchaRef.current) {
      forgotRecaptchaRef.current.reset();
    }
    setForgotForm((prev) => ({
      ...initialForgotForm,
      email: (prev.email || loginForm.email || registerForm.email || '').trim()
    }));
  };

  const handleForgotRequest = async (event) => {
    event.preventDefault();

    if (recaptchaEnabled && !forgotCaptchaToken) {
      setError('Confirme que você não é um robô para continuar.');
      return;
    }

    try {
      await runWithFeedback(
        () =>
          requestPasswordReset({
            email: forgotForm.email,
            captchaToken: forgotCaptchaToken
          }),
        { closeOnSuccess: false }
      );

      setInfo('Enviamos um código de verificação para o seu e-mail. Digite-o abaixo para continuar.');
      setError('');
      setForgotForm((prev) => ({
        ...prev,
        email: prev.email.trim(),
        code: '',
        newPassword: '',
        confirmPassword: ''
      }));
      setForgotStep(ForgotStep.VERIFY);
      setForgotCaptchaToken('');
      if (forgotRecaptchaRef.current) {
        forgotRecaptchaRef.current.reset();
      }
    } catch (err) {
      // Erro já tratado em runWithFeedback
    }
  };

  const handleForgotConfirm = async (event) => {
    event.preventDefault();

    if (!forgotForm.code.trim()) {
      setError('Informe o código enviado para o seu e-mail.');
      return;
    }

    if (forgotForm.newPassword !== forgotForm.confirmPassword) {
      setError('As senhas informadas não conferem.');
      return;
    }

    if (recaptchaEnabled && !forgotCaptchaToken) {
      setError('Confirme que você não é um robô para continuar.');
      return;
    }

    try {
      await runWithFeedback(
        () =>
          confirmPasswordReset({
            email: forgotForm.email,
            code: forgotForm.code,
            newPassword: forgotForm.newPassword,
            captchaToken: forgotCaptchaToken
          }),
        { closeOnSuccess: false }
      );

      setInfo('Senha redefinida com sucesso! Faça login com a nova senha.');
      setError('');
      const email = forgotForm.email;
      setLoginForm((prev) => ({ ...prev, email: email.trim() }));
      setForgotForm(initialForgotForm);
      setForgotCaptchaToken('');
      if (forgotRecaptchaRef.current) {
        forgotRecaptchaRef.current.reset();
      }
      setForgotStep(ForgotStep.REQUEST);
      setActiveView(View.LOGIN);
    } catch (err) {
      // erro tratado no runWithFeedback
    }
  };

  const handleVerifyEmail = async (event) => {
    event.preventDefault();

    const email = verificationForm.email.trim();
    const code = verificationForm.code.trim();

    if (!email || !code) {
      setError('Informe o e-mail e o código para confirmar.');
      return;
    }

    try {
      await runWithFeedback(
        () => verifyEmail({ email, code }),
        { closeOnSuccess: true }
      );
    } catch (err) {
      // mensagem tratada em runWithFeedback
    }
  };

  const handleResendVerification = async () => {
    if (submitting) {
      return;
    }

    if (resendSecondsLeft > 0) {
      return;
    }

    const email = verificationForm.email.trim();

    if (!email) {
      setError('Informe o e-mail cadastrado para reenviar o código.');
      return;
    }

    try {
      const result = await runWithFeedback(
        () => resendVerification({ email }),
        { closeOnSuccess: false }
      );
      setInfo(result?.message || 'Enviamos um novo código para o seu e-mail.');
      setVerificationForm((prev) => ({ ...prev, code: '' }));
      const cooldownSeconds = Number(result?.cooldownSeconds);
      if (cooldownSeconds > 0) {
        const nextTimestamp = result?.nextAvailableAt ? Date.parse(result.nextAvailableAt) : NaN;
        const base = Number.isNaN(nextTimestamp) ? Date.now() + cooldownSeconds * 1000 : nextTimestamp;
        setResendAvailableAt(base);
      }
    } catch (err) {
      const cooldownSeconds = Number(err?.payload?.cooldownSeconds);
      if (cooldownSeconds > 0) {
        const nextTimestamp = err?.payload?.nextAvailableAt ? Date.parse(err.payload.nextAvailableAt) : NaN;
        const base = Number.isNaN(nextTimestamp) ? Date.now() + cooldownSeconds * 1000 : nextTimestamp;
        setResendAvailableAt(base);
      }
      // mensagem tratada em runWithFeedback
    }
  };

  const resendButtonDisabled = submitting || resendSecondsLeft > 0;
  const resendButtonLabel = resendSecondsLeft > 0
    ? `Reenviar em ${formatSeconds(resendSecondsLeft)}`
    : 'Reenviar código';

  return (
    <div
      className={classNames(styles.backdrop, { [styles.open]: open })}
      role="dialog"
      aria-modal="true"
      onMouseDown={handleBackdropMouseDown}
      onMouseUp={handleBackdropMouseUp}
      onMouseLeave={handleBackdropMouseLeave}
    >
      <div className={styles.modal}>
        <header className={styles.header}>
          <div>
            <p className={styles.subtitle}>Bem-vinda à Reflora</p>
            <h2>{title}</h2>
            <p className={styles.headerDescription}>{headerDescription}</p>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Fechar modal de autenticação">
            ×
          </button>
        </header>

        <div className={styles.content}>
          {showPrimaryTabs && (
            <div className={styles.tabs} role="tablist" aria-label="Alternar entre login e cadastro">
              <button
                type="button"
                role="tab"
                aria-selected={activeView === View.LOGIN}
                className={classNames(styles.tabButton, { [styles.tabButtonActive]: activeView === View.LOGIN })}
                onClick={() => goToView(View.LOGIN)}
              >
                Entrar
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeView === View.REGISTER}
                className={classNames(styles.tabButton, { [styles.tabButtonActive]: activeView === View.REGISTER })}
                onClick={() => goToView(View.REGISTER)}
              >
                Criar conta
              </button>
            </div>
          )}

          {error && <div className={styles.error}>{error}</div>}
          {info && <div className={styles.info}>{info}</div>}

          {activeView === View.LOGIN ? (
            <form onSubmit={handleLogin} className={styles.form}>
              <label>
                Email
                <input
                  name="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={loginForm.email}
                  onChange={handleInputChange(setLoginForm)}
                  required
                />
              </label>
              <label>
                Senha
                <div className={styles.passwordField}>
                  <input
                    name="password"
                    type={loginPasswordVisible ? 'text' : 'password'}
                    placeholder="Mínimo 8 caracteres"
                    value={loginForm.password}
                    onChange={handleInputChange(setLoginForm)}
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    className={styles.togglePassword}
                    onClick={() => setLoginPasswordVisible((prev) => !prev)}
                    aria-label={loginPasswordVisible ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {loginPasswordVisible ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
              </label>

              <button type="button" className={styles.linkButton} onClick={() => goToView(View.FORGOT)}>
                Esqueci minha senha
              </button>

              <button type="submit" className={styles.submitButton} disabled={submitting}>
                {submitting ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          ) : activeView === View.REGISTER ? (
            <form onSubmit={handleRegister} className={styles.form}>
              <label>
                Nome completo
                <input
                  name="name"
                  placeholder="Ex: Ana Souza"
                  value={registerForm.name}
                  onChange={handleInputChange(setRegisterForm)}
                  required
                  minLength={2}
                />
              </label>
              <label>
                Email
                <input
                  name="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={registerForm.email}
                  onChange={handleInputChange(setRegisterForm)}
                  required
                />
              </label>
              <label>
                Senha
                <div className={styles.passwordField}>
                  <input
                    name="password"
                    type={registerPasswordVisible ? 'text' : 'password'}
                    placeholder="Mínimo 8 caracteres"
                    value={registerForm.password}
                    onChange={handleInputChange(setRegisterForm)}
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    className={styles.togglePassword}
                    onClick={() => setRegisterPasswordVisible((prev) => !prev)}
                    aria-label={registerPasswordVisible ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {registerPasswordVisible ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
              </label>
              <label>
                Confirmar senha
                <div className={styles.passwordField}>
                  <input
                    name="confirmPassword"
                    type={registerConfirmVisible ? 'text' : 'password'}
                    placeholder="Repita a senha"
                    value={registerForm.confirmPassword}
                    onChange={handleInputChange(setRegisterForm)}
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    className={styles.togglePassword}
                    onClick={() => setRegisterConfirmVisible((prev) => !prev)}
                    aria-label={registerConfirmVisible ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {registerConfirmVisible ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
              </label>
              <p className={styles.passwordHint}>Use ao menos 8 caracteres. Recomendamos combinar letras, números e símbolos.</p>

              {recaptchaEnabled ? (
                <div className={styles.captchaWrapper}>
                  <ReCAPTCHA
                    ref={registerRecaptchaRef}
                    sitekey={recaptchaSiteKey}
                    onChange={(token) => setRegisterCaptchaToken(token || '')}
                    onExpired={() => setRegisterCaptchaToken('')}
                  />
                </div>
              ) : (
                <p className={styles.captchaDisabled}>
                  Configure a variável <code>REACT_APP_RECAPTCHA_SITE_KEY</code> para habilitar a verificação anti-robôs.
                </p>
              )}

              <button
                type="submit"
                className={styles.submitButton}
                disabled={submitting || (recaptchaEnabled && !registerCaptchaToken)}
              >
                {submitting ? 'Criando conta...' : 'Criar conta'}
              </button>
            </form>
          ) : activeView === View.VERIFY ? (
            <form onSubmit={handleVerifyEmail} className={styles.form}>
              <p>
                Enviamos um código de confirmação para o seu e-mail. Informe abaixo para concluir o cadastro.
              </p>
              <label>
                Email
                <input
                  name="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={verificationForm.email}
                  onChange={handleInputChange(setVerificationForm)}
                  required
                />
              </label>
              <label>
                Código de verificação
                <input
                  name="code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Digite o código de 6 dígitos"
                  value={verificationForm.code}
                  onChange={handleInputChange(setVerificationForm)}
                  required
                  maxLength={6}
                />
              </label>

              <div className={styles.actionsRow}>
                <button type="button" className={styles.linkButton} onClick={() => goToView(View.LOGIN)}>
                  Voltar
                </button>
                <button
                  type="button"
                  className={styles.linkButton}
                  onClick={handleResendVerification}
                  disabled={resendButtonDisabled}
                >
                  {resendButtonLabel}
                </button>
              </div>

              {resendSecondsLeft > 0 && (
                <p className={styles.cooldownHint}>
                  Você poderá solicitar um novo código em {formatSeconds(resendSecondsLeft)}.
                </p>
              )}

              <button
                type="submit"
                className={styles.submitButton}
                disabled={submitting || verificationForm.code.trim().length === 0}
              >
                {submitting ? 'Confirmando...' : 'Confirmar e-mail'}
              </button>
            </form>
          ) : forgotStep === ForgotStep.REQUEST ? (
            <form onSubmit={handleForgotRequest} className={styles.form}>
              <label>
                Email cadastrado
                <input
                  name="email"
                  type="email"
                  placeholder="Digite o e-mail da sua conta"
                  value={forgotForm.email}
                  onChange={handleInputChange(setForgotForm)}
                  required
                />
              </label>

              {recaptchaEnabled ? (
                <div className={styles.captchaWrapper}>
                  <ReCAPTCHA
                    ref={forgotRecaptchaRef}
                    sitekey={recaptchaSiteKey}
                    onChange={(token) => setForgotCaptchaToken(token || '')}
                    onExpired={() => setForgotCaptchaToken('')}
                  />
                </div>
              ) : (
                <p className={styles.captchaDisabled}>
                  Configure a variável <code>REACT_APP_RECAPTCHA_SITE_KEY</code> para habilitar a verificação anti-robôs.
                </p>
              )}

              <div className={styles.actionsRow}>
                <button type="button" className={styles.linkButton} onClick={() => goToView(View.LOGIN)}>
                  Voltar
                </button>
                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={submitting || (recaptchaEnabled && !forgotCaptchaToken)}
                >
                  {submitting ? 'Enviando código...' : 'Enviar código'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleForgotConfirm} className={styles.form}>
              <label>
                Código de verificação
                <input
                  name="code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Digite o código de 6 dígitos"
                  value={forgotForm.code}
                  onChange={handleInputChange(setForgotForm)}
                  required
                  maxLength={6}
                />
              </label>
              <label>
                Nova senha
                <div className={styles.passwordField}>
                  <input
                    name="newPassword"
                    type={forgotNewPasswordVisible ? 'text' : 'password'}
                    placeholder="Mínimo 8 caracteres"
                    value={forgotForm.newPassword}
                    onChange={handleInputChange(setForgotForm)}
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    className={styles.togglePassword}
                    onClick={() => setForgotNewPasswordVisible((prev) => !prev)}
                    aria-label={forgotNewPasswordVisible ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {forgotNewPasswordVisible ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
              </label>
              <label>
                Confirmar nova senha
                <div className={styles.passwordField}>
                  <input
                    name="confirmPassword"
                    type={forgotConfirmPasswordVisible ? 'text' : 'password'}
                    placeholder="Repita a nova senha"
                    value={forgotForm.confirmPassword}
                    onChange={handleInputChange(setForgotForm)}
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    className={styles.togglePassword}
                    onClick={() => setForgotConfirmPasswordVisible((prev) => !prev)}
                    aria-label={forgotConfirmPasswordVisible ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {forgotConfirmPasswordVisible ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
              </label>

              {recaptchaEnabled ? (
                <div className={styles.captchaWrapper}>
                  <ReCAPTCHA
                    ref={forgotRecaptchaRef}
                    sitekey={recaptchaSiteKey}
                    onChange={(token) => setForgotCaptchaToken(token || '')}
                    onExpired={() => setForgotCaptchaToken('')}
                  />
                </div>
              ) : (
                <p className={styles.captchaDisabled}>
                  Configure a variável <code>REACT_APP_RECAPTCHA_SITE_KEY</code> para habilitar a verificação anti-robôs.
                </p>
              )}

              <div className={styles.actionsRow}>
                <button type="button" className={styles.linkButton} onClick={handleForgotBack}>
                  Voltar
                </button>
                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={submitting || (recaptchaEnabled && !forgotCaptchaToken)}
                >
                  {submitting ? 'Atualizando...' : 'Redefinir senha'}
                </button>
              </div>
            </form>
          )}

          {(activeView === View.LOGIN || activeView === View.REGISTER) && (
            <>
              <div className={styles.divider}>
                <span>ou</span>
              </div>

              {googleEnabled ? (
                <div className={styles.googleButtonWrapper}>
                  <GoogleLogin
                    onSuccess={async (credentialResponse) => {
                      if (!credentialResponse?.credential) {
                        setError('Resposta inválida do Google.');
                        return;
                      }

                      try {
                        const credential = credentialResponse.credential;
                        await runWithFeedback(() => loginWithGoogleCredential(credential));
                      } catch (err) {
                        console.error('Erro no login Google:', err);
                        setError(err.message || 'Falha na autenticação com o Google.');
                      }
                    }}
                    onError={() => {
                      setError('Não foi possível conectar ao Google. Tente novamente.');
                    }}
                    theme="outline"
                    width="100%"
                    size="large"
                    text={activeView === View.REGISTER ? 'signup_with' : 'continue_with'}
                  />
                </div>
              ) : (
                <p className={styles.googleDisabled}>
                  Configure a variável <code>REACT_APP_GOOGLE_CLIENT_ID</code> para habilitar o login com Google.
                </p>
              )}
            </>
          )}

          {activeView === View.FORGOT ? (
            <p className={styles.switcher}>
              Lembrou sua senha?{' '}
              <button type="button" onClick={() => goToView(View.LOGIN)} className={styles.switchButton}>
                Entrar
              </button>
            </p>
          ) : activeView === View.VERIFY ? (
            <p className={styles.switcher}>
              Já confirmou sua conta?{' '}
              <button type="button" onClick={() => goToView(View.LOGIN)} className={styles.switchButton}>
                Entrar
              </button>
            </p>
          ) : (
            <p className={styles.switcher}>
              {activeView === View.REGISTER
                ? 'Já possui uma conta?'
                : 'Ainda não tem conta?'}{' '}
              <button
                type="button"
                onClick={() => goToView(activeView === View.REGISTER ? View.LOGIN : View.REGISTER)}
                className={styles.switchButton}
              >
                {activeView === View.REGISTER ? 'Entrar' : 'Criar conta'}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

AuthModal.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func
};

export default AuthModal;
