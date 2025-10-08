import React, { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useAuth } from '../../context/AuthContext';
import styles from './AuthModal.module.css';
import { GoogleLogin } from '@react-oauth/google';
import ReCAPTCHA from 'react-google-recaptcha';

const View = {
  LOGIN: 'login',
  REGISTER: 'register'
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

const recaptchaSiteKey = process.env.REACT_APP_RECAPTCHA_SITE_KEY || '';
const recaptchaEnabled = Boolean(recaptchaSiteKey);

const AuthModal = ({ open, onClose }) => {
  const { login, register, loginWithGoogleCredential, loading } = useAuth();
  const googleEnabled = Boolean(process.env.REACT_APP_GOOGLE_CLIENT_ID);
  const [activeView, setActiveView] = useState(View.LOGIN);
  const [loginForm, setLoginForm] = useState(initialLoginForm);
  const [registerForm, setRegisterForm] = useState(initialRegisterForm);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const recaptchaRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setActiveView(View.LOGIN);
      setLoginForm(initialLoginForm);
      setRegisterForm(initialRegisterForm);
      setError('');
      setSubmitting(false);
      setCaptchaToken('');
      if (recaptchaRef.current) {
        recaptchaRef.current.reset();
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

  const runWithFeedback = async (fn) => {
    setSubmitting(true);
    setError('');
    try {
      await fn();
      onClose?.();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Não foi possível concluir a operação.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    await runWithFeedback(() => login({ ...loginForm }));
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    if (recaptchaEnabled && !captchaToken) {
      setError('Confirme que você não é um robô para continuar.');
      return;
    }

    await runWithFeedback(() => register({ ...registerForm, captchaToken }));
  };

  const title = useMemo(() => (activeView === View.LOGIN ? 'Entrar' : 'Criar conta'), [activeView]);

  const switchView = () => {
    setError('');
    setSubmitting(false);
    setCaptchaToken('');
    if (recaptchaRef.current) {
      recaptchaRef.current.reset();
    }
    setActiveView((prev) => (prev === View.LOGIN ? View.REGISTER : View.LOGIN));
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

              <button type="submit" className={styles.submitButton} disabled={submitting}>
                {submitting ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          ) : (
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
                    ref={recaptchaRef}
                    sitekey={recaptchaSiteKey}
                    onChange={(token) => setCaptchaToken(token || '')}
                    onExpired={() => setCaptchaToken('')}
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
                disabled={submitting || (recaptchaEnabled && !captchaToken)}
              >
                {submitting ? 'Criando conta...' : 'Criar conta'}
              </button>
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

          <p className={styles.switcher}>
            {activeView === View.LOGIN ? 'Ainda não tem conta?' : 'Já possui uma conta?'}{' '}
            <button type="button" onClick={switchView} className={styles.switchButton}>
              {activeView === View.LOGIN ? 'Criar conta' : 'Entrar' }
            </button>
          </p>
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
