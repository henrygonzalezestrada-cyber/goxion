import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';

type LegalModal = 'terms' | 'guarantee' | null;

const FAQS = [
  {
    q: '¿Cuáles son los métodos de pago?',
    a: 'Puedes realizar tu pago con los datos bancarios mostrados en tu estado de cuenta. Para que sea válido, reporta el comprobante directamente desde GOXION.',
  },
  {
    q: '¿Qué pasa si me atraso un día en mi pago?',
    a: 'Un atraso puede generar un recargo del 5% diario, con el límite configurado por GOXION. Si necesitas revisar una situación especial, utiliza Soporte desde Mi Espacio.',
  },
  {
    q: '¿Puedo cambiar la contraseña de mi perfil?',
    a: 'Puedes personalizar el PIN de un perfil cuando el servicio lo permita. No cambies el correo ni la contraseña general de una cuenta administrada por GOXION.',
  },
  {
    q: '¿Cómo funciona el beneficio por referido?',
    a: 'El referido debe cumplir los requisitos de plataformas activas y permanencia. Cuando GOXION detecta que el ciclo está completo, el beneficio puede reclamarse desde Mi Espacio.',
  },
];

export function HomeExperience({
  onCatalog,
  onSpace,
}: {
  onCatalog: () => void;
  onSpace: () => void;
}) {
  const [faq, setFaq] = useState<number | null>(null);
  const [legal, setLegal] = useState<LegalModal>(null);

  return (
    <>
      <section>
        <div className="section-title">¿Cómo funciona Goxion?</div>

        <div className="hiw-grid">
          <motion.article
            className="hiw-step"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-35px' }}
          >
            <div className="hiw-num">01</div>
            <div className="hiw-title">
              <span>🛒</span> Elige tu servicio
            </div>
            <div className="hiw-desc">
              Selecciona la plataforma o producto que necesitas desde nuestro
              catálogo.
            </div>
          </motion.article>

          <motion.article
            className="hiw-step"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-35px' }}
            transition={{ delay: 0.05 }}
          >
            <div className="hiw-num">02</div>
            <div className="hiw-title">
              <span>💳</span> Realiza tu compra
            </div>
            <div className="hiw-desc">
              Completa tu pedido de forma rápida, privada y segura.
            </div>
          </motion.article>

          <motion.article
            className="hiw-step"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-35px' }}
            transition={{ delay: 0.1 }}
          >
            <div className="hiw-num">03</div>
            <div className="hiw-title">
              <span>🚀</span> Recibe tu acceso
            </div>
            <div className="hiw-desc">
              Tras la validación correspondiente, recibe tus datos y comienza a
              disfrutar.
            </div>
          </motion.article>
        </div>

        <motion.button
          type="button"
          className="btn-primary gx-catalog-main-cta"
          onClick={onCatalog}
          whileTap={{ scale: 0.985 }}
        >
          <span>Ver servicios disponibles</span>
          <span>→</span>
        </motion.button>
      </section>

      <section>
        <div className="section-title">¿Por qué comprar aquí?</div>

        <div className="benefits-grid">
          <article className="benefit-box">
            <div className="benefit-icon">⚡</div>
            <div className="benefit-title">Activación ágil</div>
            <div className="benefit-desc">
              Seguimiento claro desde que registras tu pedido hasta que recibes
              tu acceso.
            </div>
          </article>

          <article className="benefit-box">
            <div className="benefit-icon">🛡️</div>
            <div className="benefit-title">Garantía y Trato Justo</div>
            <div className="benefit-desc">
              Si una falla técnica aplica, GOXION calcula la compensación
              correspondiente.
            </div>
          </article>

          <article className="benefit-box">
            <div className="benefit-icon">💬</div>
            <div className="benefit-title">Soporte dedicado</div>
            <div className="benefit-desc">
              Tu solicitud llega con el contexto de tu cuenta y servicio.
            </div>
          </article>

          <article className="benefit-box">
            <div className="benefit-icon">🔒</div>
            <div className="benefit-title">Espacio protegido</div>
            <div className="benefit-desc">
              Sesiones, PIN y credenciales sensibles usan flujos separados y
              controlados.
            </div>
          </article>
        </div>
      </section>

      <section className="feature-card">
        <div className="feature-title">Tu compra, sin complicaciones</div>
        <div className="feature-desc">
          Tus servicios quedan ligados a Mi Espacio para consultar accesos,
          estado de cuenta, beneficios y soporte desde un mismo lugar.
        </div>

        <hr />

        <div className="feature-title feature-title-blue">
          🤝 Estamos contigo post-compra
        </div>
        <div className="feature-desc">
          Si necesitas ayuda con un acceso, renovación o incidencia, el flujo
          queda dentro de GOXION.
        </div>

        <div className="timeline-box">
          <div className="timeline-step">
            <div className="timeline-icon">📱</div>
            <div className="timeline-text">Reportas</div>
          </div>
          <div className="timeline-step">
            <div className="timeline-icon">🔍</div>
            <div className="timeline-text">Revisamos</div>
          </div>
          <div className="timeline-step">
            <div className="timeline-icon">✅</div>
            <div className="timeline-text">Resolvemos</div>
          </div>
        </div>
      </section>

      <section className="feature-card has-promo-card">
        <div className="feature-badge">EXCLUSIVO</div>
        <div className="feature-title">Todo bajo control en tu Espacio</div>
        <div className="feature-desc">
          Consulta tu cuenta, administra accesos, revisa beneficios y solicita
          soporte desde el mismo lugar.
        </div>

        <div className="rotating-benefits-container">
          <div className="rotating-benefit-item active">
            <span>🧾</span>
            <div className="rotating-benefit-text">
              Consulta tu estado de cuenta y reporta tu pago desde GOXION.
            </div>
          </div>
        </div>

        <button
          type="button"
          className="btn-primary gx-space-feature-entry"
          onClick={onSpace}
        >
          Entrar a Mi Espacio
        </button>
      </section>

      <section className="faq-container">
        <div className="section-title">Preguntas Frecuentes</div>

        {FAQS.map((item, index) => {
          const open = faq === index;
          return (
            <motion.article
              layout
              key={item.q}
              className={'faq-item ' + (open ? 'open' : '')}
            >
              <button
                type="button"
                className="faq-header"
                onClick={() => setFaq(open ? null : index)}
                aria-expanded={open}
              >
                <span>{item.q}</span>
                <motion.span className="icon" animate={{ rotate: open ? 180 : 0 }}>
                  ▼
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    className="faq-body"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    {item.a}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.article>
          );
        })}
      </section>

      <section className="gx-official-legal-links">
        <button type="button" onClick={() => setLegal('terms')}>
          Términos y Condiciones
        </button>
        <span>•</span>
        <button type="button" onClick={() => setLegal('guarantee')}>
          Garantía y Trato Justo
        </button>
      </section>

      <AnimatePresence>
        {legal && (
          <motion.div
            className="gx-legal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setLegal(null);
            }}
          >
            <motion.section
              className="gx-legal-sheet"
              initial={{ opacity: 0, y: 18, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10 }}
            >
              <button
                type="button"
                className="gx-legal-close"
                onClick={() => setLegal(null)}
              >
                ×
              </button>

              {legal === 'terms' ? (
                <>
                  <span className="gx-help-section-kicker">GOXION</span>
                  <h2>Términos y Condiciones</h2>
                  <p>
                    Al utilizar un servicio GOXION, el cliente acepta las reglas
                    de uso, pago y seguridad aplicables a su cuenta.
                  </p>
                  <ol>
                    <li>
                      <strong>Confidencialidad.</strong> Credenciales, enlaces y
                      accesos son personales y no deben compartirse con terceros
                      no autorizados.
                    </li>
                    <li>
                      <strong>Uso permitido.</strong> Las cuentas deben utilizarse
                      conforme al servicio contratado y a las reglas de cada
                      plataforma.
                    </li>
                    <li>
                      <strong>Dispositivos.</strong> Los cambios de dispositivo o
                      uso simultáneo deben respetar las condiciones indicadas por
                      GOXION.
                    </li>
                    <li>
                      <strong>Pagos.</strong> La fecha y el importe vigentes son
                      los que aparecen en Mi Espacio. El comprobante debe
                      reportarse desde GOXION.
                    </li>
                  </ol>
                </>
              ) : (
                <>
                  <span className="gx-help-section-kicker">RESPALDO GOXION</span>
                  <h2>Garantía y Trato Justo</h2>
                  <p>
                    Las compensaciones y cargos se calculan de forma proporcional
                    sobre el periodo y servicio afectados.
                  </p>
                  <div className="gx-legal-rules">
                    <article>
                      <strong>Falla técnica</strong>
                      <span>5% de compensación diaria</span>
                      <small>Hasta 50% del servicio afectado.</small>
                    </article>
                    <article>
                      <strong>Mora</strong>
                      <span>5% de recargo diario</span>
                      <small>Hasta 50% del saldo aplicable.</small>
                    </article>
                    <article>
                      <strong>Reactivación</strong>
                      <span>20% cuando corresponda</span>
                      <small>Aplica conforme al estado de la cuenta.</small>
                    </article>
                  </div>
                </>
              )}
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
