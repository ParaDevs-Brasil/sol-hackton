import { useLang } from "./i18n";

/* Seção "Get started in 3 steps": três etapas em layout escalonado
   (esq / dir / esq no desktop; empilhado e uniforme no mobile). Cada etapa
   tem uma label curta e um retângulo placeholder para mídia futura.

   Para plugar a mídia real, importe os assets e troque os `null` abaixo:
     import stepWalletMedia from "./assets/step-wallet.png";
     import stepPredictionMedia from "./assets/step-prediction.png";
     import stepRewardsMedia from "./assets/step-rewards.png";
   Depois preencha `stepMedia` na mesma ordem das etapas. Quando o item
   não for null, ele é renderizado como <img>; caso contrário, mostra o
   placeholder cinza. */
const stepMedia: (string | null)[] = [
  null, // stepWalletMedia
  null, // stepPredictionMedia
  null, // stepRewardsMedia
];

export default function HowItWorksSection() {
  const { t } = useLang();

  return (
    <section className="get-started reveal" id="get-started">
      <h2 className="get-started-title">{t.getStarted.title}</h2>

      <ol className="get-started-steps">
        {t.getStarted.steps.map((step, i) => (
          <li className="get-started-step" key={step.label}>
            <span className="get-started-label">{step.label}</span>

            {stepMedia[i] ? (
              <img
                className="get-started-media-img"
                src={stepMedia[i]!}
                alt={step.label}
              />
            ) : (
              <div
                className="get-started-media"
                role="img"
                aria-label={`${step.label} — ${t.getStarted.soon}`}
              >
                <span className="get-started-hint mono">{t.getStarted.soon}</span>
              </div>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
