namespace Api.Domain.Entities;

public abstract class Entity
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
}
