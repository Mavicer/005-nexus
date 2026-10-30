import Link from "next/link";
export default function About() {
  return (
    <div className="stack" style={{ maxWidth: 820, margin: "auto" }}>
      <div>
        <h1>收录说明</h1>
        <p className="muted">
          Nexus 面向计算机专业学生，收集以代码、模型和可运行作品为核心的赛事。
        </p>
      </div>
      <section className="panel">
        <h2>我们收录什么</h2>
        <p className="prose">
          黑客松、开发挑战、数学建模、AI / 数据、CTF
          和算法竞赛。国内外兼收，重视参赛条件、技术任务和时间依据。考证、保研、泛商业策划和付费训练营不在当前范围。
        </p>
      </section>
      <section className="panel">
        <h2>核验意味着什么</h2>
        <p className="prose">
          每条公开活动均有官方依据和核验日期。来源可访问不等于事实正确；“已核验”不保证你符合全部资格。未知信息会明确标注，报名与作品提交分别记录。站点不代替官方报名，不承诺奖项或就业结果。
        </p>
        <p className="small muted">
          发现日期或资格有误，可以通过赛事详情的纠错入口提供原始规则链接。建议进入人工核对流程，不会自动发布。
        </p>
      </section>
      <section className="panel" id="sources">
        <h2>从官方入口继续发现</h2>
        <p className="small muted">
          以下是发现入口，平台中的每项活动仍需逐项核查。
        </p>
        <div className="stack">
          {[
            [
              "Devpost",
              "国际黑客松与开发挑战",
              "https://devpost.com/hackathons",
            ],
            ["Devfolio", "开发实践活动目录", "https://devfolio.co/hackathons"],
            [
              "MLH",
              "学生黑客松日程",
              "https://www.mlh.com/seasons/2027/events",
            ],
            [
              "阿里云天池",
              "AI、数据与工程开发竞赛",
              "https://tianchi.aliyun.com/competition",
            ],
          ].map(([name, description, url]) => (
            <div key={name} className="card-top">
              <div>
                <strong>{name}</strong>
                <p className="small muted" style={{ margin: "5px 0" }}>
                  {description}
                </p>
              </div>
              <a
                className="btn"
                href={url}
                target="_blank"
                rel="noopener noreferrer"
              >
                前往 ↗
              </a>
            </div>
          ))}
        </div>
      </section>
      <Link className="btn primary" href="/">
        查看赛事
      </Link>
    </div>
  );
}
