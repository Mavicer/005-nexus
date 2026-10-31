import { NATIONAL_DIRECTORY } from "@/modules/events/directory";
export default function Ranking() {
  return (
    <div className="stack">
      <h1>排序依据</h1>{" "}
      <section className="panel" id="directory">
        <h2>排序依据</h2>
        <p className="prose">
          默认重点展示RoboMaster系列，其他赛事综合专业认可度、全国目录和具体赛项的技术要求，分为“专业标杆”“重点赛事”“实践体验”。这是本站推荐判断，不是官方甲乙等级。同一推荐层级中，目录收录作为优先依据；之后按报名状态及国内优先等规则排序。
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
    </div>
  );
}
