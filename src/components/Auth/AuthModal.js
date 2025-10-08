import React, { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useAuth } from '../../context/AuthContext';
import styles from './AuthModal.module.css';
import { GoogleLogin } from '@react-oauth/google';
import ReCAPTCHA from 'react-google-recaptcha';

const View = {
  LOGIN: 'login',
  REGISTER: 'register',
  FORGOT: 'forgot'
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
  password: ''
};

const initialForgotForm = {
  email: '',
  code: '',
  newPassword: '',
  confirmPassword: ''
};

const recaptchaSiteKey = process.env.REACT_APP_RECAPTCHA_SITE_KEY || '';
const recaptchaEnabled = Boolean(recaptchaSiteKey);

const AuthModal = ({ open, onClose }) => {
  const { login, register, requestPasswordReset, confirmPasswordReset, loginWithGoogleCredential } = useAuth();
  const googleEnabled = Boolean(process.env.REACT_APP_GOOGLE_CLIENT_ID);
  const [activeView, setActiveView] = useState(View.LOGIN);
  const [loginForm, setLoginForm] = useState(initialLoginForm);
  const [registerForm, setRegisterForm] = useState(initialRegisterForm);
  const [forgotForm, setForgotForm] = useState(initialForgotForm);
  const [forgotStep, setForgotStep] = useState(ForgotStep.REQUEST);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [registerCaptchaToken, setRegisterCaptchaToken] = useState('');
  const [forgotCaptchaToken, setForgotCaptchaToken] = useState('');
  const registerRecaptchaRef = useRef(null);
  const forgotRecaptchaRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setActiveView(View.LOGIN);
      setLoginForm(initialLoginForm);
      setRegisterForm(initialRegisterForm);
      setForgotForm(initialForgotForm);
      setForgotStep(ForgotStep.REQUEST);
      setError('');
      setInfo('');
      setSubmitting(false);
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

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) {
      onClose?.();
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      onClose?.();
    }
  };

  useEffect(() => {
    if (!open) {
      return;
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const handleInputChange = (formSetter) => (event) => {
    const { name, value } = event.target;
    formSetter((prev) => ({ ...prev, [name]: value }));
  };

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

    if (view === View.FORGOT) {
      setForgotForm((prev) => ({
        ...initialForgotForm,
        email: (loginForm.email || registerForm.email || prev.email || '').trim()
      }));
      setForgotStep(ForgotStep.REQUEST);
    } else {
      setForgotForm(initialForgotForm);
      setForgotStep(ForgotStep.REQUEST);
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

    await runWithFeedback(() => register({ ...registerForm, captchaToken: registerCaptchaToken }));
  };

  const title = useMemo(() => {
    switch (activeView) {
      case View.REGISTER:
        return 'Criar conta';
      case View.FORGOT:
        return 'Redefinir senha';
      case View.LOGIN:
      default:
        return 'Entrar';
    }
  }, [activeView]);

  const handleForgotBack = () => {
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

  return (
    <div className={classNames(styles.backdrop, { [styles.open]: open })} role="dialog" aria-modal="true" onClick={handleBackdropClick}>
      <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
        <header className={styles.header}>
          <h2>{title}</h2>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Fechar modal de autenticação">
            ×
          </button>
        </header>

        <div className={styles.content}>
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
                <input
                  name="password"
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  value={loginForm.password}
                  onChange={handleInputChange(setLoginForm)}
                  required
                  minLength={8}
                />
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
                <input
                  name="password"
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  value={registerForm.password}
                  onChange={handleInputChange(setRegisterForm)}
                  required
                  minLength={8}
                />
              </label>

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
                <input
                  name="newPassword"
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  value={forgotForm.newPassword}
                  onChange={handleInputChange(setForgotForm)}
                  required
                  minLength={8}
                />
              </label>
              <label>
                Confirmar nova senha
                <input
                  name="confirmPassword"
                  type="password"
                  placeholder="Repita a nova senha"
                  value={forgotForm.confirmPassword}
                  onChange={handleInputChange(setForgotForm)}
                  required
                  minLength={8}
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
                useOneTap
                theme="outline"
                width="100%"
                size="large"
                text="continue_with"
              />
            </div>
          ) : (
            <p className={styles.googleDisabled}>
              Configure a variável <code>REACT_APP_GOOGLE_CLIENT_ID</code> para habilitar o login com Google.
            </p>
          )}

          {activeView === View.FORGOT ? (
            <p className={styles.switcher}>
              Lembrou sua senha?{' '}
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
