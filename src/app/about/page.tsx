import { NATIONAL_DIRECTORY } from "@/modules/events/directory";
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
      <section className="panel" id="directory">
        <h2>排序依据</h2>
        <p className="prose">
          默认综合专业认可度、全国目录和具体赛项的技术要求，分为“专业标杆”“重点赛事”“实践体验”。这是本站推荐判断，不是官方甲乙等级。同一推荐层级中，目录收录作为优先依据；之后按报名状态及国内优先等规则排序。
        </p>
        <p className="prose">
          国赛、美赛、CCSP、RMUC和电赛等侧重完整专业能力的赛事优先考虑；联盟赛与全国赛、专题赛与主赛、常规周赛与锦标赛分别评价。新办黑客松可以有较高作品实践价值，但不因主办方品牌直接抬高奖项定位。
        </p>
        <h3>只按全国目录排序</h3>
        <p className="prose">
          依据可核对的2024版公开目录，优先展示赛事名称已匹配的活动，其次是所属系列已收录的赛项，再展示尚未确认收录的活动。同组内按报名状态、国内优先等推荐规则排序。目录序号不作为含金量名次，也不换算为甲乙等级。
        </p>
        <p className="prose">
          “所属系列收录”只表示系列名称出现在该版目录，不承诺当前子赛项或奖项被所在学校认定。未确认收录不表示赛事质量低。RoboMaster
          在该版目录的旧名称备注中出现，当前赛项的适用范围暂未确认。
        </p>
        <a
          href={NATIONAL_DIRECTORY.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {NATIONAL_DIRECTORY.title}（高校公开存档） ↗
        </a>
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
