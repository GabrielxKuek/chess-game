import "./Card.css";

interface Props {
  image?: string;
  highlight?: boolean;
}

export default function Card({ image, highlight }: Props) {
  return (
    <div className={`card ${highlight ? "card-highlight" : ""}`}>
      {image && <div className="card-image" style={{ backgroundImage: `url(${image})` }}></div>}
    </div>
  );
}