using Api.Domain.Entities;

namespace Api.Application.Interfaces;

public interface IJwtGenerator
{
    string Generate(User user);
}
